/**
 * Agrobase V3 — Standard Cooperative Chart of Accounts
 * MobiPay AgroSys Limited
 *
 * Default chart of accounts for agricultural cooperatives.
 * Each account has code, name, type, normalBalance, and optional parent.
 * Includes seedChartOfAccounts and getAccountsByType helpers.
 */

import { db } from '@/lib/db'

// ---------------------------------------------------------------------------
// Account Types
// ---------------------------------------------------------------------------

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
export type NormalBalance = 'DEBIT' | 'CREDIT'

// ---------------------------------------------------------------------------
// Chart Account Definition
// ---------------------------------------------------------------------------

export interface ChartAccountDef {
  code: string
  name: string
  type: AccountType
  normalBalance: NormalBalance
  parentCode?: string
}

// ---------------------------------------------------------------------------
// Default Chart of Accounts
// ---------------------------------------------------------------------------

/**
 * Standard chart of accounts for an agricultural cooperative.
 * Code structure:
 *   1xxx — Assets
 *   2xxx — Liabilities
 *   3xxx — Equity
 *   4xxx — Revenue
 *   5xxx — Expenses
 */
export const DEFAULT_CHART_OF_ACCOUNTS: ChartAccountDef[] = [
  // === 1xxx — ASSETS ===
  { code: '1000', name: 'Current Assets', type: 'ASSET', normalBalance: 'DEBIT' },
  { code: '1001', name: 'Cash', type: 'ASSET', normalBalance: 'DEBIT', parentCode: '1000' },
  { code: '1002', name: 'Bank', type: 'ASSET', normalBalance: 'DEBIT', parentCode: '1000' },
  { code: '1003', name: 'Accounts Receivable - Farmers', type: 'ASSET', normalBalance: 'DEBIT', parentCode: '1000' },
  { code: '1004', name: 'Produce Inventory', type: 'ASSET', normalBalance: 'DEBIT', parentCode: '1000' },
  { code: '1005', name: 'Input Inventory', type: 'ASSET', normalBalance: 'DEBIT', parentCode: '1000' },
  { code: '1006', name: 'Equipment', type: 'ASSET', normalBalance: 'DEBIT', parentCode: '1000' },

  // === 2xxx — LIABILITIES ===
  { code: '2000', name: 'Current Liabilities', type: 'LIABILITY', normalBalance: 'CREDIT' },
  { code: '2001', name: 'Accounts Payable - Farmers', type: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2000' },
  { code: '2002', name: 'Loan Payable', type: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2000' },
  { code: '2003', name: 'Farmer Deposits', type: 'LIABILITY', normalBalance: 'CREDIT', parentCode: '2000' },

  // === 3xxx — EQUITY ===
  { code: '3000', name: 'Equity', type: 'EQUITY', normalBalance: 'CREDIT' },
  { code: '3001', name: 'Member Equity', type: 'EQUITY', normalBalance: 'CREDIT', parentCode: '3000' },
  { code: '3002', name: 'Retained Earnings', type: 'EQUITY', normalBalance: 'CREDIT', parentCode: '3000' },
  { code: '3003', name: 'Current Year Surplus', type: 'EQUITY', normalBalance: 'CREDIT', parentCode: '3000' },

  // === 4xxx — REVENUE ===
  { code: '4000', name: 'Revenue', type: 'REVENUE', normalBalance: 'CREDIT' },
  { code: '4001', name: 'Produce Sales', type: 'REVENUE', normalBalance: 'CREDIT', parentCode: '4000' },
  { code: '4002', name: 'Service Fees', type: 'REVENUE', normalBalance: 'CREDIT', parentCode: '4000' },
  { code: '4003', name: 'Processing Fees', type: 'REVENUE', normalBalance: 'CREDIT', parentCode: '4000' },

  // === 5xxx — EXPENSES ===
  { code: '5000', name: 'Expenses', type: 'EXPENSE', normalBalance: 'DEBIT' },
  { code: '5001', name: 'Transport', type: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5000' },
  { code: '5002', name: 'Processing', type: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5000' },
  { code: '5003', name: 'Labor', type: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5000' },
  { code: '5004', name: 'Administration', type: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5000' },
  { code: '5005', name: 'Depreciation', type: 'EXPENSE', normalBalance: 'DEBIT', parentCode: '5000' },
]

// ---------------------------------------------------------------------------
// Lookup Maps
// ---------------------------------------------------------------------------

const accountByCode = new Map<string, ChartAccountDef>(
  DEFAULT_CHART_OF_ACCOUNTS.map((a) => [a.code, a]),
)

export function getAccountByCode(code: string): ChartAccountDef | undefined {
  return accountByCode.get(code)
}

// ---------------------------------------------------------------------------
// Seed: Create Account records for a tenant
// ---------------------------------------------------------------------------

/**
 * Seed the chart of accounts into the Account table for a given tenant.
 * Only creates accounts that don't already exist (by code + tenantId).
 */
export async function seedChartOfAccounts(tenantId: string): Promise<void> {
  for (const def of DEFAULT_CHART_OF_ACCOUNTS) {
    // Check if account already exists for this tenant
    const existing = await db.account.findFirst({
      where: { tenantId, code: def.code },
    })

    if (!existing) {
      await db.account.create({
        data: {
          tenantId,
          code: def.code,
          name: def.name,
          type: def.type,
          normalBalance: def.normalBalance,
          parentId: def.parentCode
            ? (await db.account.findFirst({ where: { tenantId, code: def.parentCode } }))?.id ?? null
            : null,
        },
      })
    }
  }

  console.log(`[ChartOfAccounts] Seeded ${DEFAULT_CHART_OF_ACCOUNTS.length} accounts for tenant ${tenantId}`)
}

// ---------------------------------------------------------------------------
// Query: Filter accounts by type
// ---------------------------------------------------------------------------

/**
 * Get all accounts of a given type for a tenant.
 */
export async function getAccountsByType(
  tenantId: string,
  type: AccountType,
) {
  return db.account.findMany({
    where: { tenantId, type, isActive: true },
    orderBy: { code: 'asc' },
  })
}