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
      db.rainforestCertification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { farmer: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.rainforestCertification.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Rainforest certifications' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const cert = await db.rainforestCertification.create({
      data: {
        farmerId: body.farmerId || null,
        certificateNo: body.certificateNo,
        certificationLevel: body.certificationLevel,
        issueDate: new Date(body.issueDate),
        expiryDate: new Date(body.expiryDate),
        auditDate: body.auditDate ? new Date(body.auditDate) : null,
        auditorName: body.auditorName || null,
        auditScore: body.auditScore ?? null,
        criticalFindings: body.criticalFindings ?? 0,
        majorFindings: body.majorFindings ?? 0,
        minorFindings: body.minorFindings ?? 0,
        status: body.status || 'ACTIVE',
        nextAuditDate: body.nextAuditDate ? new Date(body.nextAuditDate) : null,
      },
      include: { farmer: true },
    })
    return NextResponse.json(cert, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create Rainforest certification' }, { status: 500 })
  }
}