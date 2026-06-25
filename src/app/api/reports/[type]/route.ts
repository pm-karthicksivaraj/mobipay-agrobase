import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  let data: unknown = []

  switch (type) {
    case 'farmer-registration':
      data = await db.farmerProfile.findMany({ select: { id: true, firstName: true, lastName: true, farmerCode: true, phone: true, gender: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 })
      break
    case 'vsla-savings':
      data = await db.vslaSaving.findMany({ include: { farmer: { select: { firstName: true, lastName: true } }, vslaGroup: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 })
      break
    case 'vsla-loans':
      data = await db.vslaLoan.findMany({ include: { farmer: { select: { firstName: true, lastName: true } }, vslaGroup: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 })
      break
    case 'market-sales':
      data = await db.marketMatch.findMany({ include: { product: true }, orderBy: { createdAt: 'desc' }, take: 100 })
      break
    case 'payments':
      data = await db.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
      break
    case 'trainings':
      data = await db.training.findMany({ include: { _count: { select: { attendance: true } } }, orderBy: { date: 'desc' }, take: 100 })
      break
    case 'credit-scores':
      data = await db.creditScore.findMany({ include: { farmer: { select: { firstName: true, lastName: true, farmerCode: true } } }, orderBy: { scoreDate: 'desc' }, take: 100 })
      break
    case 'attendance':
      data = await db.trainingAttendance.findMany({ include: { training: { select: { topic: true, date: true } }, farmer: { select: { firstName: true, lastName: true } } }, take: 200 })
      break
    default:
      data = await db.farmerProfile.findMany({ take: 50 })
  }

  return NextResponse.json({ data, type })
}