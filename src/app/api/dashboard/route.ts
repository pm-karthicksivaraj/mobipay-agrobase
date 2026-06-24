import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const [farmerCount, vslaCount, totalSavings, activeLoans, marketListings, trainingCount, payments, monthlyFarmerData, vslaSavingsData, recentTransactions] = await Promise.all([
    db.farmerProfile.count({ where: { status: 'ACTIVE' } }),
    db.vslaGroup.count({ where: { isActive: true } }),
    db.vslaSaving.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
    db.vslaLoan.count({ where: { status: { in: ['DISBURSED', 'PENDING'] } } }),
    db.marketProduct.count({ where: { status: 'AVAILABLE' } }),
    db.training.count(),
    db.payment.count({ where: { status: 'COMPLETED' } }),
    // Monthly farmer registrations (simulated)
    Promise.resolve([
      { month: 'Jan', count: 45 }, { month: 'Feb', count: 62 }, { month: 'Mar', count: 78 },
      { month: 'Apr', count: 95 }, { month: 'May', count: 110 }, { month: 'Jun', count: 50 },
    ]),
    // VSLA savings by group
    db.vslaGroup.findMany({ where: { isActive: true }, include: { _count: { select: { savings: true, members: true, loans: true } }, savings: { select: { amount: true } } } }),
    // Recent transactions
    db.payment.findMany({ take: 10, orderBy: { createdAt: 'desc' } }),
  ])

  const vslaSavingsByGroup = vslaSavingsData.map(g => ({
    name: g.name.replace(' VSLA', ''),
    savings: g.savings.reduce((sum: number, s: any) => sum + s.amount, 0),
    members: g._count.members,
    loans: g._count.loans,
  }))

  return NextResponse.json({
    farmerCount,
    vslaCount,
    totalSavings: totalSavings._sum.amount || 0,
    activeLoans,
    marketListings,
    trainingCount,
    totalPayments: payments,
    monthlyFarmerData,
    vslaSavingsByGroup,
    recentTransactions,
  })
}