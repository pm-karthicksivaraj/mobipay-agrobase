import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [data, total] = await Promise.all([
      db.globalGapCertification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { farmer: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.globalGapCertification.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch GLOBALG.A.P. certifications' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const cert = await db.globalGapCertification.create({
      data: {
        farmerId: body.farmerId || null,
        ggnNumber: body.ggnNumber,
        scope: body.scope,
        version: body.version || null,
        option: body.option,
        issueDate: new Date(body.issueDate),
        expiryDate: new Date(body.expiryDate),
        auditDate: body.auditDate ? new Date(body.auditDate) : null,
        auditorName: body.auditorName || null,
        compliancePercentage: body.compliancePercentage ?? null,
        status: body.status || 'ACTIVE',
        nextAuditDate: body.nextAuditDate ? new Date(body.nextAuditDate) : null,
      },
      include: { farmer: true },
    })
    return NextResponse.json(cert, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create GLOBALG.A.P. certification' }, { status: 500 })
  }
}