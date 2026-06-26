import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current_month'

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (period) {
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'current_year':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = now
        break
      case 'current_month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = now
        break
    }

    const tenantWhere = ctx.isSuperAdmin
      ? {}
      : { tenantId: { in: ctx.tenantScope as string[] } }

    // Gather usage metrics in parallel
    const [
      farmerCount,
      vslaGroupCount,
      vslaSavingsTotal,
      vslaLoansTotal,
      purchaseCount,
      saleCount,
      paymentCount,
      trainingCount,
      farmVisitCount,
    ] = await Promise.all([
      db.farmerProfile.count({
        where: { ...tenantWhere, createdAt: { gte: startDate, lte: endDate } },
      }),
      db.vslaGroup.count({
        where: { ...tenantWhere, createdAt: { gte: startDate, lte: endDate } },
      }),
      db.vslaSaving.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
          ...(ctx.isSuperAdmin ? {} : { vslaGroup: { tenantId: { in: ctx.tenantScope as string[] } } }),
        },
        _sum: { amount: true },
      }),
      db.vslaLoan.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          ...(ctx.isSuperAdmin ? {} : { vslaGroup: { tenantId: { in: ctx.tenantScope as string[] } } }),
        },
        _sum: { amount: true },
        _count: true,
      }),
      db.purchase.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          ...(ctx.isSuperAdmin ? {} : { farmer: { tenantId: { in: ctx.tenantScope as string[] } } }),
        },
      }),
      db.sale.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          ...(ctx.isSuperAdmin ? {} : { farmer: { tenantId: { in: ctx.tenantScope as string[] } } }),
        },
      }),
      db.payment.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          ...(ctx.isSuperAdmin ? {} : { paymentAccount: { tenantId: { in: ctx.tenantScope as string[] } } }),
        },
      }),
      db.training.count({
        where: { date: { gte: startDate, lte: endDate }, ...(ctx.isSuperAdmin ? {} : { tenantId: { in: ctx.tenantScope as string[] } }) },
      }),
      db.farmVisit.count({
        where: {
          visitDate: { gte: startDate, lte: endDate },
          ...(ctx.isSuperAdmin ? {} : { farmer: { tenantId: { in: ctx.tenantScope as string[] } } }),
        },
      }),
    ])

    return NextResponse.json({
      period,
      startDate,
      endDate,
      metrics: {
        farmers: { new: farmerCount },
        vsla: { groups: vslaGroupCount, savingsTotal: vslaSavingsTotal._sum.amount || 0, loans: vslaLoansTotal._count },
        purchases: purchaseCount,
        sales: saleCount,
        payments: paymentCount,
        trainings: trainingCount,
        farmVisits: farmVisitCount,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch usage report' }, { status: 500 })
  }
}