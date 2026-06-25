import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const riskAssessment = searchParams.get('riskAssessment') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (riskAssessment) where.riskAssessment = riskAssessment

    const [data, total] = await Promise.all([
      db.eudrCompliance.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { farmer: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.eudrCompliance.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch EUDR records' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const record = await db.eudrCompliance.create({
      data: {
        farmerId: body.farmerId || null,
        plotId: body.plotId,
        plotName: body.plotName,
        geolocation: typeof body.geolocation === 'string' ? body.geolocation : JSON.stringify(body.geolocation),
        areaHectares: body.areaHectares,
        commodities: typeof body.commodities === 'string' ? body.commodities : JSON.stringify(body.commodities),
        deforestationFree: body.deforestationFree ?? false,
        deforestationDate: body.deforestationDate ? new Date(body.deforestationDate) : null,
        legalDocuments: body.legalDocuments ? (typeof body.legalDocuments === 'string' ? body.legalDocuments : JSON.stringify(body.legalDocuments)) : null,
        riskAssessment: body.riskAssessment || null,
        dueDiligenceRef: body.dueDiligenceRef || null,
        status: body.status || 'PENDING',
        verifiedBy: body.verifiedBy || null,
        verifiedAt: body.verifiedAt ? new Date(body.verifiedAt) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      },
      include: { farmer: true },
    })
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create EUDR compliance record' }, { status: 500 })
  }
}