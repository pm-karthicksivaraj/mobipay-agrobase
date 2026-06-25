import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const ctx = await getTenantContext()
    const { type } = await params
    let data: unknown = []
    const tenantWhere = buildTenantFilter(ctx, 'tenantId')

    switch (type) {
      case 'farmer-registration':
        data = await db.farmerProfile.findMany({
          where: tenantWhere,
          select: { id: true, firstName: true, lastName: true, farmerCode: true, phone: true, gender: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' }, take: 100,
        })
        break
      case 'vsla-savings': {
        const vslaSavingsWhere: Record<string, unknown> = { status: 'COMPLETED' }
        if (!ctx.isSuperAdmin) {
          vslaSavingsWhere.vslaGroup = { tenantId: { in: ctx.tenantScope } }
        }
        data = await db.vslaSaving.findMany({
          where: vslaSavingsWhere,
          include: { farmer: { select: { firstName: true, lastName: true } }, vslaGroup: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }, take: 100,
        })
        break
      }
      case 'vsla-loans': {
        const vslaLoansWhere: Record<string, unknown> = {}
        if (!ctx.isSuperAdmin) {
          vslaLoansWhere.vslaGroup = { tenantId: { in: ctx.tenantScope } }
        }
        data = await db.vslaLoan.findMany({
          where: vslaLoansWhere,
          include: { farmer: { select: { firstName: true, lastName: true } }, vslaGroup: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }, take: 100,
        })
        break
      }
      case 'market-sales':
        // Marketplace is cross-tenant, but filter sales through farmer if needed
        data = await db.marketMatch.findMany({ include: { product: true }, orderBy: { createdAt: 'desc' }, take: 100 })
        break
      case 'payments': {
        const paymentWhere: Record<string, unknown> = {}
        if (!ctx.isSuperAdmin) {
          paymentWhere.paymentAccount = { tenantId: { in: ctx.tenantScope } }
        }
        data = await db.payment.findMany({
          where: paymentWhere,
          orderBy: { createdAt: 'desc' }, take: 100,
        })
        break
      }
      case 'trainings':
        // TODO: Add tenantId to Training model for full multi-tenant isolation
        data = await db.training.findMany({
          include: { _count: { select: { attendance: true } } },
          orderBy: { date: 'desc' }, take: 100,
        })
        break
      case 'credit-scores': {
        const creditWhere: Record<string, unknown> = {}
        if (!ctx.isSuperAdmin) {
          creditWhere.farmer = { tenantId: { in: ctx.tenantScope } }
        }
        data = await db.creditScore.findMany({
          where: creditWhere,
          include: { farmer: { select: { firstName: true, lastName: true, farmerCode: true } } },
          orderBy: { scoreDate: 'desc' }, take: 100,
        })
        break
      }
      case 'attendance':
        // TODO: Add tenantId to Training model for full multi-tenant isolation
        data = await db.trainingAttendance.findMany({
          include: { training: { select: { topic: true, date: true } }, farmer: { select: { firstName: true, lastName: true } } },
          take: 200,
        })
        break
      default:
        data = await db.farmerProfile.findMany({ where: tenantWhere, take: 50 })
    }

    return NextResponse.json({ data, type })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}