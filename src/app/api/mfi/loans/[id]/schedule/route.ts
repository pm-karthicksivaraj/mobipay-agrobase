import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(ctx.role, 'mfi:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: loanId } = await params

    const schedule = await db.mfiLoanSchedule.findMany({
      where: { loanId },
      orderBy: { installmentNumber: 'asc' },
    })

    const loan = await db.mfiLoan.findFirst({
      where: { id: loanId, tenantId: ctx.tenantId },
      select: {
        id: true, applicantName: true, amount: true, approvedAmount: true,
        status: true, totalPaid: true, outstandingBalance: true,
        totalInterest: true, totalPenalty: true, interestRate: true,
        durationMonths: true, disbursedAt: true,
        loanProduct: { select: { name: true, interestRateType: true } },
      },
    })

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    const totalPrincipalDue = schedule.reduce((s, r) => s + r.principalDue, 0)
    const totalInterestDue = schedule.reduce((s, r) => s + r.interestDue, 0)
    const totalPenaltyDue = schedule.reduce((s, r) => s + r.penaltyDue, 0)
    const totalDue = schedule.reduce((s, r) => s + r.totalDue, 0)
    const totalPaid = schedule.reduce((s, r) => s + r.totalPaid, 0)

    return NextResponse.json({
      data: {
        loan,
        schedule,
        summary: {
          totalPrincipalDue,
          totalInterestDue,
          totalPenaltyDue,
          totalDue,
          totalPaid,
          remaining: Math.max(0, totalDue - totalPaid),
        },
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}