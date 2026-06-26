import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET() {
  const ctx = await getTenantContext()
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const [purchases, sales, consignments, deliveries, feedback, messages, surveys, creditScores, loanApps, farmerCount, userCount, tenantCount] = await Promise.all([
    db.purchase.findMany({ where: { farmer: { tenantId: ctx.tenantId } }, include: { farmer: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.sale.findMany({ where: { farmer: { tenantId: ctx.tenantId } }, include: { farmer: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.consignment.findMany({ where: { ...tf }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.delivery.findMany({ where: { ...tf }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.feedback.findMany({ where: { ...tf }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.message.findMany({ where: { ...tf }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.survey.findMany({ where: { ...tf }, include: { _count: { select: { questions: true, responses: true } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
    db.creditScore.findMany({ where: { farmer: { tenantId: ctx.tenantId } }, include: { farmer: true }, orderBy: { scoreDate: 'desc' }, take: 30 }),
    db.loanApplication.findMany({ where: { loanProduct: { tenantId: ctx.tenantId } }, include: { loanProduct: true }, orderBy: { createdAt: 'desc' }, take: 30 }),
    db.farmerProfile.count({ where: { ...tf, status: 'ACTIVE' } }),
    db.user.count({ where: { ...tf } }),
    db.tenant.count(),
  ])

  return NextResponse.json({ purchases, sales, consignments, deliveries, feedback, messages, surveys, creditScores, loanApps, farmerCount, userCount, tenantCount })
}