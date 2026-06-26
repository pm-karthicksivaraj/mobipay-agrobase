import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'

export async function GET() {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'reports:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Return a default chart of accounts structure
    // Full chart-of-accounts model integration pending schema update
    const defaultAccounts = [
      { code: '1000', name: 'Cash', type: 'ASSET', category: 'Current Assets', balance: 0 },
      { code: '1100', name: 'Bank Account', type: 'ASSET', category: 'Current Assets', balance: 0 },
      { code: '1200', name: 'Accounts Receivable', type: 'ASSET', category: 'Current Assets', balance: 0 },
      { code: '1500', name: 'Loans Receivable', type: 'ASSET', category: 'Current Assets', balance: 0 },
      { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', category: 'Current Liabilities', balance: 0 },
      { code: '2100', name: 'VSLA Savings Payable', type: 'LIABILITY', category: 'Current Liabilities', balance: 0 },
      { code: '3000', name: 'Member Equity', type: 'EQUITY', category: 'Equity', balance: 0 },
      { code: '3100', name: 'Retained Earnings', type: 'EQUITY', category: 'Equity', balance: 0 },
      { code: '4000', name: 'Sales Revenue', type: 'REVENUE', category: 'Revenue', balance: 0 },
      { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', category: 'Cost of Sales', balance: 0 },
      { code: '6000', name: 'Operating Expenses', type: 'EXPENSE', category: 'Operating Expenses', balance: 0 },
      { code: '6100', name: 'Interest Income', type: 'REVENUE', category: 'Other Revenue', balance: 0 },
      { code: '6200', name: 'Interest Expense', type: 'EXPENSE', category: 'Finance Costs', balance: 0 },
    ]

    // Compute actual balances from existing data
    const tenantFilter = ctx.isSuperAdmin
      ? {}
      : { tenantId: { in: ctx.tenantScope } }

    const [savingsTotal, loansTotal, loansRepaid, paymentsTotal] = await Promise.all([
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

    const accounts = defaultAccounts.map(a => {
      let balance = 0
      if (a.code === '2100') balance = savingsTotal._sum.amount || 0
      if (a.code === '1500') balance = (loansTotal._sum.amount || 0) - (loansRepaid._sum.amountRepaid || 0)
      if (a.code === '6100') balance = (loansRepaid._sum.amountRepaid || 0) * 0.1 // estimated interest
      return { ...a, balance }
    })

    return NextResponse.json({
      data: accounts,
      tenantId: ctx.tenantId,
      note: 'Default chart of accounts with computed balances. Full model integration pending schema update.',
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch chart of accounts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'reports:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { code, name, type, category } = body as {
      code: string
      name: string
      type: string
      category?: string
    }

    if (!code || !name || !type) {
      return NextResponse.json({ error: 'code, name, and type are required' }, { status: 400 })
    }

    if (!['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].includes(type)) {
      return NextResponse.json({ error: 'type must be ASSET, LIABILITY, EQUITY, REVENUE, or EXPENSE' }, { status: 400 })
    }

    // Return the account as data — full persistence pending chart-of-accounts model
    const account = {
      code,
      name,
      type,
      category: category || type,
      balance: 0,
      tenantId: ctx.tenantId,
      isCustom: true,
    }

    return NextResponse.json({
      data: account,
      note: 'Custom account accepted. Full persistence pending chart-of-accounts model in schema.',
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}