import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'reports:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const report = searchParams.get('report') || 'trial_balance'
    const asOfDate = searchParams.get('asOfDate') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    const tenantWhere = ctx.isSuperAdmin
      ? {}
      : { tenantId: { in: ctx.tenantScope as string[] } }

    switch (report) {
      case 'trial_balance': {
        // Aggregate financial data as a trial balance proxy
        const [totalPayments, totalSavings, totalLoans, totalPurchases] = await Promise.all([
          db.payment.aggregate({
            where: {
              ...(ctx.isSuperAdmin ? {} : { paymentAccount: { tenantId: { in: ctx.tenantScope as string[] } } }),
              status: 'COMPLETED',
              ...(asOfDate ? { createdAt: { lte: new Date(asOfDate) } } : {}),
            },
            _sum: { amount: true },
            _count: true,
          }),
          db.vslaSaving.aggregate({
            where: {
              status: 'COMPLETED',
              ...(ctx.isSuperAdmin ? {} : { vslaGroup: { tenantId: { in: ctx.tenantScope as string[] } } }),
              ...(asOfDate ? { createdAt: { lte: new Date(asOfDate) } } : {}),
            },
            _sum: { amount: true },
            _count: true,
          }),
          db.vslaLoan.aggregate({
            where: {
              status: { in: ['DISBURSED', 'PENDING'] },
              ...(ctx.isSuperAdmin ? {} : { vslaGroup: { tenantId: { in: ctx.tenantScope as string[] } } }),
              ...(asOfDate ? { createdAt: { lte: new Date(asOfDate) } } : {}),
            },
            _sum: { amount: true, amountRepaid: true },
            _count: true,
          }),
          db.purchase.aggregate({
            where: {
              status: 'APPROVED',
              ...(ctx.isSuperAdmin ? {} : { farmer: { tenantId: { in: ctx.tenantScope as string[] } } }),
              ...(asOfDate ? { createdAt: { lte: new Date(asOfDate) } } : {}),
            },
            _sum: { totalAmount: true },
            _count: true,
          }),
        ])

        const dateFilter = asOfDate ? ` as of ${asOfDate}` : ''

        return NextResponse.json({
          report: 'trial_balance',
          dateFilter,
          accounts: [
            {
              account: 'Payments (Cash Out)',
              debit: totalPayments._sum.amount || 0,
              credit: 0,
              count: totalPayments._count,
            },
            {
              account: 'VSLA Savings (Liability)',
              debit: 0,
              credit: totalSavings._sum.amount || 0,
              count: totalSavings._count,
            },
            {
              account: 'VSLA Loans (Asset)',
              debit: totalLoans._sum.amount || 0,
              credit: 0,
              count: totalLoans._count,
              repaid: totalLoans._sum.amountRepaid || 0,
            },
            {
              account: 'Purchases Payable (Liability)',
              debit: 0,
              credit: totalPurchases._sum.totalAmount || 0,
              count: totalPurchases._count,
            },
          ],
          totalDebit: (totalPayments._sum.amount || 0) + (totalLoans._sum.amount || 0),
          totalCredit: (totalSavings._sum.amount || 0) + (totalPurchases._sum.totalAmount || 0),
          note: 'Trial balance derived from existing models. Full chart-of-accounts integration pending schema update.',
        })
      }

      case 'income_statement': {
        const [totalSales, totalPurchasesInc] = await Promise.all([
          db.sale.aggregate({
            where: {
              status: 'COMPLETED',
              ...(ctx.isSuperAdmin ? {} : { farmer: { tenantId: { in: ctx.tenantScope as string[] } } }),
              ...(startDate ? { createdAt: { gte: new Date(startDate) } } : {}),
              ...(endDate ? { createdAt: { lte: new Date(endDate) } } : {}),
            },
            _sum: { totalAmount: true },
            _count: true,
          }),
          db.purchase.aggregate({
            where: {
              status: { in: ['APPROVED', 'PAID'] },
              ...(ctx.isSuperAdmin ? {} : { farmer: { tenantId: { in: ctx.tenantScope as string[] } } }),
              ...(startDate ? { createdAt: { gte: new Date(startDate) } } : {}),
              ...(endDate ? { createdAt: { lte: new Date(endDate) } } : {}),
            },
            _sum: { totalAmount: true },
            _count: true,
          }),
        ])

        const revenue = totalSales._sum.totalAmount || 0
        const costOfSales = totalPurchasesInc._sum.totalAmount || 0

        return NextResponse.json({
          report: 'income_statement',
          period: { startDate: startDate || null, endDate: endDate || null },
          revenue,
          costOfSales,
          grossProfit: revenue - costOfSales,
          salesCount: totalSales._count,
          purchaseCount: totalPurchasesInc._count,
          note: 'Income statement derived from sales/purchases. Full chart-of-accounts integration pending schema update.',
        })
      }

      case 'balance_sheet': {
        const [totalSavings, totalLoansOut, totalLoansRepaid, totalPaymentsMade] = await Promise.all([
          db.vslaSaving.aggregate({
            where: {
              status: 'COMPLETED',
              ...(ctx.isSuperAdmin ? {} : { vslaGroup: { tenantId: { in: ctx.tenantScope as string[] } } }),
            },
            _sum: { amount: true },
          }),
          db.vslaLoan.aggregate({
            where: {
              status: { in: ['DISBURSED', 'PENDING'] },
              ...(ctx.isSuperAdmin ? {} : { vslaGroup: { tenantId: { in: ctx.tenantScope as string[] } } }),
            },
            _sum: { amount: true },
            _count: true,
          }),
          db.vslaLoan.aggregate({
            where: {
              ...(ctx.isSuperAdmin ? {} : { vslaGroup: { tenantId: { in: ctx.tenantScope as string[] } } }),
            },
            _sum: { amountRepaid: true },
          }),
          db.payment.aggregate({
            where: {
              status: 'COMPLETED',
              ...(ctx.isSuperAdmin ? {} : { paymentAccount: { tenantId: { in: ctx.tenantScope as string[] } } }),
            },
            _sum: { amount: true },
          }),
        ])

        const loanPortfolio = (totalLoansOut._sum.amount || 0) - (totalLoansRepaid._sum.amountRepaid || 0)

        return NextResponse.json({
          report: 'balance_sheet',
          asOfDate: asOfDate || new Date().toISOString(),
          assets: {
            loansOutstanding: totalLoansOut._sum.amount || 0,
            loansRepaid: totalLoansRepaid._sum.amountRepaid || 0,
            netLoanPortfolio: loanPortfolio,
          },
          liabilities: {
            vslaSavingsOwed: totalSavings._sum.amount || 0,
          },
          equity: {
            retainedEarnings: loanPortfolio - (totalSavings._sum.amount || 0),
          },
          totalPaymentsProcessed: totalPaymentsMade._sum.amount || 0,
          note: 'Balance sheet derived from VSLA/payment data. Full chart-of-accounts integration pending schema update.',
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid report type. Use: trial_balance, income_statement, balance_sheet' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate accounting report' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'reports:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { description, reference, entries } = body as {
      description: string
      reference?: string
      entries: Array<{ accountId: string; entryType: string; amount: number }>
    }

    if (!description || !entries || entries.length === 0) {
      return NextResponse.json({ error: 'description and entries are required' }, { status: 400 })
    }

    // Validate entries balance (debits must equal credits)
    const totalDebits = entries.filter(e => e.entryType === 'DEBIT').reduce((s, e) => s + e.amount, 0)
    const totalCredits = entries.filter(e => e.entryType === 'CREDIT').reduce((s, e) => s + e.amount, 0)

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json(
        { error: 'Journal entries must balance', totalDebits, totalCredits, difference: totalDebits - totalCredits },
        { status: 400 }
      )
    }

    // Store as a VSLA transaction proxy until journal entry model is added
    const transaction = await db.vslaTransaction.create({
      data: {
        vslaGroupId: entries[0]?.accountId || '',
        type: 'SHARE_REDEEM',
        amount: totalDebits,
        description: `${description}${reference ? ` [${reference}]` : ''}`,
        transactionRef: reference || `JE-${Date.now()}`,
        status: 'COMPLETED',
      },
    })

    return NextResponse.json({
      data: {
        transaction,
        entries,
        totalDebits,
        totalCredits,
      },
      note: 'Journal entry stored as VSLA transaction proxy until chart-of-accounts model is added',
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create journal entry' }, { status: 500 })
  }
}