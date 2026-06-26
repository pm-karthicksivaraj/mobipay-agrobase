/**
 * Agrobase V3 — Double-Entry Accounting Engine
 * MobiPay AgroSys Limited
 *
 * AccountingEngine class using Prisma JournalEntry + JournalLine models.
 * Supports journal entry creation, posting, reversal, account balance,
 * trial balance, income statement, balance sheet, and ledger queries.
 */

import { db } from '@/lib/db'
import { roundMoney } from '../payments/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JournalEntryInput {
  accountCode: string
  entryType: 'DEBIT' | 'CREDIT'
  amount: number
  description?: string
}

export interface TrialBalanceAccount {
  accountId: string
  accountCode: string
  accountName: string
  accountType: string
  debitBalance: number
  creditBalance: number
  netBalance: number
  normalSide: string
}

export interface IncomeStatementLine {
  accountCode: string
  accountName: string
  amount: number
}

export interface FinancialStatementItem {
  accountCode: string
  accountName: string
  amount: number
}

export interface LedgerEntry {
  journalEntryId: string
  date: Date
  description: string
  reference: string
  entryType: string
  amount: number
  runningBalance: number
}

// ---------------------------------------------------------------------------
// AccountingEngine Class
// ---------------------------------------------------------------------------

export class AccountingEngine {
  /**
   * Create a journal entry.
   * Validates that debits = credits, creates JournalEntry + JournalLines, status DRAFT.
   *
   * @param tenantId    - The tenant creating the entry
   * @param entries     - Array of debit/credit lines
   * @param description - Description of the transaction
   * @param reference   - External reference
   * @param createdBy   - User ID of the creator
   * @returns The created JournalEntry
   */
  static async createJournalEntry(
    tenantId: string,
    entries: JournalEntryInput[],
    description: string,
    reference: string,
    createdBy: string,
  ) {
    // Validate debits = credits
    const totalDebits = entries
      .filter((e) => e.entryType === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0)

    const totalCredits = entries
      .filter((e) => e.entryType === 'CREDIT')
      .reduce((sum, e) => sum + e.amount, 0)

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(
        `Journal entry not balanced: debits (${roundMoney(totalDebits)}) ≠ credits (${roundMoney(totalCredits)})`,
      )
    }

    // Resolve account codes to DB Account IDs
    const accountIds = new Map<string, string>()
    const accountNames = new Map<string, string>()

    for (const entry of entries) {
      if (accountIds.has(entry.accountCode)) continue

      const account = await db.account.findFirst({
        where: { tenantId, code: entry.accountCode, isActive: true },
      })

      if (!account) {
        throw new Error(`Invalid account code: ${entry.accountCode}`)
      }

      accountIds.set(entry.accountCode, account.id)
      accountNames.set(entry.accountCode, account.name)
    }

    // Create JournalEntry with nested JournalLines
    const journalEntry = await db.journalEntry.create({
      data: {
        tenantId,
        description,
        reference,
        createdBy,
        status: 'DRAFT',
        lines: {
          create: entries.map((entry) => ({
            accountId: accountIds.get(entry.accountCode)!,
            entryType: entry.entryType,
            amount: roundMoney(entry.amount),
            description: entry.description,
          })),
        },
      },
      include: { lines: true },
    })

    console.log(
      `[AccountingEngine] Created journal entry ${journalEntry.id}: ${roundMoney(totalDebits)} DR / ${roundMoney(totalCredits)} CR`,
    )

    return journalEntry
  }

  /**
   * Post a journal entry. Sets status POSTED, updates postedBy/postedAt.
   */
  static async postJournalEntry(
    entryId: string,
    postedBy: string,
  ) {
    const entry = await db.journalEntry.findUnique({ where: { id: entryId } })

    if (!entry) {
      throw new Error(`Journal entry not found: ${entryId}`)
    }

    if (entry.status === 'POSTED') {
      throw new Error(`Journal entry already posted: ${entryId}`)
    }

    const updated = await db.journalEntry.update({
      where: { id: entryId },
      data: {
        status: 'POSTED',
        postedBy,
        postedAt: new Date(),
      },
    })

    console.log(`[AccountingEngine] Posted journal entry ${entryId}`)
    return updated
  }

  /**
   * Reverse a journal entry by creating a reversed copy with negative amounts.
   */
  static async reverseJournalEntry(
    entryId: string,
    reason: string,
  ) {
    const original = await db.journalEntry.findUnique({
      where: { id: entryId },
      include: { lines: true },
    })

    if (!original) {
      throw new Error(`Journal entry not found: ${entryId}`)
    }

    if (original.status !== 'POSTED') {
      throw new Error(`Cannot reverse a non-posted entry: ${entryId}`)
    }

    // Build reversed lines (swap DEBIT ↔ CREDIT)
    const reversedLines: JournalEntryInput[] = original.lines.map((line) => ({
      accountCode: line.accountId, // We need the code, resolve below
      entryType: (line.entryType === 'DEBIT' ? 'CREDIT' : 'DEBIT') as 'DEBIT' | 'CREDIT',
      amount: line.amount,
      description: `Reversal: ${line.description ?? ''}`,
    }))

    // Resolve account IDs to codes
    const accountIdToCode = new Map<string, string>()
    for (const line of original.lines) {
      if (accountIdToCode.has(line.accountId)) continue
      const account = await db.account.findUnique({ where: { id: line.accountId } })
      if (account) accountIdToCode.set(line.accountId, account.code)
    }

    const finalLines: JournalEntryInput[] = reversedLines.map((line) => ({
      ...line,
      accountCode: accountIdToCode.get(line.accountCode) ?? line.accountCode,
    }))

    // Create and post the reversal entry
    const reversal = await AccountingEngine.createJournalEntry(
      original.tenantId,
      finalLines,
      `REVERSAL: ${reason}`,
      `REV-${original.reference ?? entryId}`,
      original.reversedBy ?? original.createdBy ?? '',
    )

    await AccountingEngine.postJournalEntry(reversal.id, original.reversedBy ?? '')

    // Mark original as reversed
    await db.journalEntry.update({
      where: { id: entryId },
      data: {
        status: 'REVERSED',
        reversedBy: original.createdBy,
        reversedAt: new Date(),
      },
    })

    console.log(`[AccountingEngine] Reversed journal entry ${entryId}: ${reason}`)
    return reversal
  }

  /**
   * Get the running balance of an account by summing posted journal lines.
   */
  static async getAccountBalance(
    tenantId: string,
    accountId: string,
    asOfDate?: Date,
  ): Promise<number> {
    const account = await db.account.findUnique({ where: { id: accountId } })

    if (!account) {
      throw new Error(`Account not found: ${accountId}`)
    }

    // Only sum lines from POSTED entries
    const where: Record<string, unknown> = {
      accountId,
      journalEntry: {
        tenantId,
        status: 'POSTED',
      },
    }

    if (asOfDate) {
      where.journalEntry = {
        ...(where.journalEntry as Record<string, unknown>),
        date: { lte: asOfDate },
      }
    }

    const lines = await db.journalLine.findMany({
      where,
    })

    let balance = 0
    for (const line of lines) {
      if (line.entryType === 'DEBIT') {
        balance += line.amount
      } else {
        balance -= line.amount
      }
    }

    // For CREDIT normal balance accounts, flip so positive = credit
    if (account.normalBalance === 'CREDIT') {
      balance = -balance
    }

    return roundMoney(balance)
  }

  /**
   * Get the trial balance: all accounts with DR/CR balances.
   */
  static async getTrialBalance(tenantId: string, asOfDate?: Date) {
    const accounts = await db.account.findMany({
      where: { tenantId, isActive: true },
      orderBy: { code: 'asc' },
    })

    const result: TrialBalanceAccount[] = []

    for (const account of accounts) {
      const balance = await AccountingEngine.getAccountBalance(tenantId, account.id, asOfDate)
      if (balance === 0) continue

      let debitBalance = 0
      let creditBalance = 0

      if (account.normalBalance === 'DEBIT') {
        debitBalance = balance >= 0 ? balance : 0
        creditBalance = balance < 0 ? Math.abs(balance) : 0
      } else {
        creditBalance = balance >= 0 ? balance : 0
        debitBalance = balance < 0 ? Math.abs(balance) : 0
      }

      result.push({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        debitBalance: roundMoney(debitBalance),
        creditBalance: roundMoney(creditBalance),
        netBalance: roundMoney(balance),
        normalSide: account.normalBalance,
      })
    }

    const totalDebits = roundMoney(result.reduce((sum, a) => sum + a.debitBalance, 0))
    const totalCredits = roundMoney(result.reduce((sum, a) => sum + a.creditBalance, 0))

    return {
      tenantId,
      asOfDate: asOfDate ?? new Date(),
      accounts: result,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    }
  }

  /**
   * Get income statement: revenue accounts vs expense accounts.
   */
  static async getIncomeStatement(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const accounts = await db.account.findMany({
      where: { tenantId, isActive: true, type: { in: ['REVENUE', 'EXPENSE'] } },
      orderBy: { code: 'asc' },
    })

    const revenue: IncomeStatementLine[] = []
    const expenses: IncomeStatementLine[] = []

    for (const account of accounts) {
      const balanceBefore = await AccountingEngine.getAccountBalance(tenantId, account.id, startDate)
      const balanceAfter = await AccountingEngine.getAccountBalance(tenantId, account.id, endDate)
      const periodAmount = Math.abs(balanceAfter - balanceBefore)

      if (periodAmount === 0) continue

      const line: IncomeStatementLine = {
        accountCode: account.code,
        accountName: account.name,
        amount: roundMoney(periodAmount),
      }

      if (account.type === 'REVENUE') {
        revenue.push(line)
      } else {
        expenses.push(line)
      }
    }

    const totalRevenue = roundMoney(revenue.reduce((sum, r) => sum + r.amount, 0))
    const totalExpenses = roundMoney(expenses.reduce((sum, e) => sum + e.amount, 0))

    return {
      tenantId,
      startDate,
      endDate,
      revenue,
      totalRevenue,
      expenses,
      totalExpenses,
      netIncome: roundMoney(totalRevenue - totalExpenses),
    }
  }

  /**
   * Get balance sheet: assets, liabilities, equity.
   */
  static async getBalanceSheet(tenantId: string, asOfDate?: Date) {
    const accounts = await db.account.findMany({
      where: { tenantId, isActive: true, type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] } },
      orderBy: { code: 'asc' },
    })

    const assets: FinancialStatementItem[] = []
    const liabilities: FinancialStatementItem[] = []
    const equity: FinancialStatementItem[] = []

    for (const account of accounts) {
      const balance = await AccountingEngine.getAccountBalance(tenantId, account.id, asOfDate)
      if (balance === 0) continue

      const item: FinancialStatementItem = {
        accountCode: account.code,
        accountName: account.name,
        amount: Math.abs(roundMoney(balance)),
      }

      switch (account.type) {
        case 'ASSET': assets.push(item); break
        case 'LIABILITY': liabilities.push(item); break
        case 'EQUITY': equity.push(item); break
      }
    }

    const totalAssets = roundMoney(assets.reduce((sum, a) => sum + a.amount, 0))
    const totalLiabilities = roundMoney(liabilities.reduce((sum, l) => sum + l.amount, 0))
    const totalEquity = roundMoney(equity.reduce((sum, e) => sum + e.amount, 0))

    return {
      tenantId,
      asOfDate: asOfDate ?? new Date(),
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equity,
      totalEquity,
      totalLiabilitiesAndEquity: roundMoney(totalLiabilities + totalEquity),
      isBalanced: Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01,
    }
  }

  /**
   * Get detailed ledger for an account with running balance.
   */
  static async getLedger(
    tenantId: string,
    accountId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const account = await db.account.findUnique({ where: { id: accountId } })
    if (!account) {
      throw new Error(`Account not found: ${accountId}`)
    }

    // Get posted journal lines for this account
    const where: Record<string, unknown> = {
      accountId,
      journalEntry: {
        tenantId,
        status: 'POSTED',
      },
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {}
      if (startDate) dateFilter.gte = startDate
      if (endDate) dateFilter.lte = endDate
      ;(where.journalEntry as Record<string, unknown>).date = dateFilter
    }

    const lines = await db.journalLine.findMany({
      where,
      include: {
        journalEntry: {
          select: { date: true, description: true, reference: true },
        },
      },
      orderBy: {
        journalEntry: { date: 'asc' },
      },
    })

    // Calculate opening balance
    let openingBalance = 0
    if (startDate) {
      const priorLines = await db.journalLine.findMany({
        where: {
          accountId,
          journalEntry: {
            tenantId,
            status: 'POSTED',
            date: { lt: startDate },
          },
        },
      })

      for (const line of priorLines) {
        openingBalance += line.entryType === 'DEBIT' ? line.amount : -line.amount
      }

      if (account.normalBalance === 'CREDIT') {
        openingBalance = -openingBalance
      }
    }

    // Build ledger entries with running balance
    let runningBalance = openingBalance
    const ledgerEntries: LedgerEntry[] = lines.map((line) => {
      if (account.normalBalance === 'CREDIT') {
        runningBalance += line.entryType === 'CREDIT' ? line.amount : -line.amount
      } else {
        runningBalance += line.entryType === 'DEBIT' ? line.amount : -line.amount
      }

      return {
        journalEntryId: line.journalEntryId,
        date: line.journalEntry.date,
        description: line.journalEntry.description,
        reference: line.journalEntry.reference ?? '',
        entryType: line.entryType,
        amount: line.amount,
        runningBalance: roundMoney(runningBalance),
      }
    })

    return {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      startDate: startDate ?? new Date(0),
      endDate: endDate ?? new Date(),
      openingBalance: roundMoney(openingBalance),
      entries: ledgerEntries,
      closingBalance: roundMoney(runningBalance),
    }
  }
}