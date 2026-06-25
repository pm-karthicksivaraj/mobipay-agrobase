import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const { id } = await params
  const body = await req.json()
  const loan = await db.vslaLoan.update({
    where: { id, ...tf },
    data: {
      status: body.status || 'APPROVED',
      approvedByIds: JSON.stringify(body.approverIds || ['admin']),
      approvedAt: new Date()
    }
  })
  if (body.status === 'APPROVED') {
    await db.vslaLoan.update({
      where: { id, ...tf }, data: { status: 'DISBURSED', disbursedAt: new Date() }
    })
  }
  return NextResponse.json({ data: loan })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const { id } = await params
  const body = await req.json()
  const loan = await db.vslaLoan.findUnique({ where: { id } })
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })

  const repayment = await db.vslaLoanRepayment.create({
    data: { loanId: id, amount: body.amount, transactionRef: `RPY-${Date.now()}`, tenantId: ctx.tenantId }
  })
  const allRepayments = await db.vslaLoanRepayment.findMany({ where: { loanId: id, ...tf } })
  const totalRepaid = allRepayments.reduce((sum, r) => sum + r.amount, 0)
  const newStatus = totalRepaid >= loan.totalRepayable ? 'REPAID' : 'DISBURSED'
  await db.vslaLoan.update({
    where: { id, ...tf },
    data: { amountRepaid: totalRepaid, status: newStatus }
  })
  return NextResponse.json({ data: repayment })
}