import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()

    // Fetch pending purchases
    const pendingPurchases = await db.purchase.findMany({
      where: { status: 'PENDING', farmer: { tenantId: ctx.tenantId } },
      include: { farmer: true },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch pending loan applications
    const pendingLoans = await db.loanApplication.findMany({
      where: { status: 'PENDING', loanProduct: { tenantId: ctx.tenantId } },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch pending input requests (filtered by tenant via dealer relationship)
    const pendingInputRequests = await db.inputRequest.findMany({
      where: { status: 'PENDING', dealer: { tenantId: ctx.tenantId } },
      orderBy: { createdAt: 'desc' },
    })

    // Combine into unified approvals list
    const approvals = [
      ...pendingPurchases.map((p) => ({
        id: p.id,
        type: 'PURCHASE' as const,
        title: `Purchase: ${p.commodity}`,
        applicant: p.farmer
          ? `${p.farmer.firstName} ${p.farmer.lastName}`
          : 'Unknown',
        amount: p.totalAmount,
        date: p.createdAt,
        status: p.status,
      })),
      ...pendingLoans.map((l) => ({
        id: l.id,
        type: 'LOAN' as const,
        title: `Loan: ${l.purpose || 'General'}`,
        applicant: l.applicantName,
        amount: l.amount,
        date: l.createdAt,
        status: l.status,
      })),
      ...pendingInputRequests.map((r) => ({
        id: r.id,
        type: 'INPUT_REQUEST' as const,
        title: `Input Request: ${r.product}`,
        applicant: r.farmerName,
        amount: r.totalPrice,
        date: r.createdAt,
        status: r.status,
      })),
    ]

    // Sort by date descending
    approvals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      data: approvals,
      total: approvals.length,
      summary: {
        purchases: pendingPurchases.length,
        loans: pendingLoans.length,
        inputRequests: pendingInputRequests.length,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 })
  }
}