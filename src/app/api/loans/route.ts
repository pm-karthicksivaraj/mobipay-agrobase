import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET() {
  try {
    const ctx = await getTenantContext()
    const productWhere = { ...buildTenantFilter(ctx, 'tenantId'), isActive: true }

    // For loan applications, filter through loanProduct tenantId
    const appWhere: Record<string, unknown> = {}
    if (!ctx.isSuperAdmin) {
      appWhere.loanProduct = { tenantId: { in: ctx.tenantScope } }
    }

    const [loans, products] = await Promise.all([
      db.loanApplication.findMany({
        where: appWhere,
        include: { loanProduct: true },
        orderBy: { createdAt: 'desc' }, take: 50,
      }),
      db.loanProduct.findMany({ where: productWhere })
    ])
    return NextResponse.json({ loans, products })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()

    // Verify loan product belongs to tenant
    if (!ctx.isSuperAdmin) {
      const product = await db.loanProduct.findFirst({
        where: { id: body.loanProductId, tenantId: { in: ctx.tenantScope } },
      })
      if (!product) {
        return NextResponse.json({ error: 'Loan product not found in your tenant' }, { status: 403 })
      }
    }

    const loan = await db.loanApplication.create({
      data: { loanProductId: body.loanProductId, applicantName: body.applicantName, applicantPhone: body.applicantPhone, amount: body.amount, purpose: body.purpose, status: 'PENDING' }
    })
    return NextResponse.json(loan, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create loan application' }, { status: 500 })
  }
}