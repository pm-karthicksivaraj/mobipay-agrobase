import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const [purchases, sales, consignments, deliveries, feedback, messages, surveys, creditScores, loanApps, farmerCount, userCount, tenantCount] = await Promise.all([
    db.purchase.findMany({ include: { farmer: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.sale.findMany({ include: { farmer: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.consignment.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    db.delivery.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    db.feedback.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    db.message.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    db.survey.findMany({ include: { _count: { select: { questions: true, responses: true } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
    db.creditScore.findMany({ include: { farmer: true }, orderBy: { scoreDate: 'desc' }, take: 30 }),
    db.loanApplication.findMany({ include: { loanProduct: true }, orderBy: { createdAt: 'desc' }, take: 30 }),
    db.farmerProfile.count({ where: { status: 'ACTIVE' } }),
    db.user.count(),
    db.tenant.count(),
  ])

  return NextResponse.json({ purchases, sales, consignments, deliveries, feedback, messages, surveys, creditScores, loanApps, farmerCount, userCount, tenantCount })
}