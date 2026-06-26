import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const { id } = await params

  const loan = await db.vslaLoan.findFirst({
    where: { id, ...tf },
    include: {
      repayments: { orderBy: { createdAt: 'desc' } },
      vslaGroup: { select: { id: true, name: true } },
      farmer: { select: { id: true, firstName: true, lastName: true } },
    },
  })
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
  return NextResponse.json({ data: loan })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const { id } = await params
  const body = await req.json()

  const existing = await db.vslaLoan.findFirst({ where: { id, ...tf } })
  if (!existing) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })

  const { status, amount, interestRate, purpose } = body
  const loan = await db.vslaLoan.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(amount !== undefined && { amount }),
      ...(interestRate !== undefined && { interestRate }),
      ...(purpose !== undefined && { purpose }),
      ...(status === 'APPROVED' && { approvedAt: new Date() }),
      ...(status === 'DISBURSED' && { disbursedAt: new Date() }),
    },
  })
  return NextResponse.json({ data: loan })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const { id } = await params
  const body = await req.json()
  const loan = await db.vslaLoan.findFirst({ where: { id, ...tf } })
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })

  const repayment = await db.vslaLoanRepayment.create({
    data: { loanId: id, amount: body.amount, transactionRef: `RPY-${Date.now()}`, tenantId: ctx.tenantId },
  })
  const allRepayments = await db.vslaLoanRepayment.findMany({ where: { loanId: id, ...tf } })
  const totalRepaid = allRepayments.reduce((sum, r) => sum + r.amount, 0)
  const newStatus = totalRepaid >= loan.totalRepayable ? 'REPAID' : 'DISBURSED'
  await db.vslaLoan.update({
    where: { id },
    data: { amountRepaid: totalRepaid, status: newStatus },
  })
  return NextResponse.json({ data: repayment })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const { id } = await params

  const existing = await db.vslaLoan.findFirst({ where: { id, ...tf } })
  if (!existing) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })

  // Only PENDING loans can be deleted/cancelled
  if (existing.status !== 'PENDING') {
    return NextResponse.json({ error: 'Only pending loans can be cancelled' }, { status: 400 })
  }

  await db.vslaLoan.update({
    where: { id },
    data: { status: 'REJECTED', updatedAt: new Date() },
  })
  return NextResponse.json({ message: 'Loan cancelled' })
}