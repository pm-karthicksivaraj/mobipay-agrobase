import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { NextResponse } from 'next/server'

function generatePassportId(country: string): string {
  const code = country === 'Uganda' ? 'UG' : country === 'Ghana' ? 'GH' : country === 'Kenya' ? 'KE' : 'XX'
  const year = new Date().getFullYear()
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `AGRO-${code}-${year}-${suffix}`
}

async function buildPassportData(farmerId: string, tenantId: string) {
  const farmer = await db.farmerProfile.findUnique({
    where: { id: farmerId },
    include: {
      tenant: { select: { name: true, country: true, type: true } },
      farms: true,
      eudrCompliances: { where: { status: 'VERIFIED' } },
      rainforestCerts: true,
      globalGapCerts: true,
      productBatches: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  })

  if (!farmer) return null

  const passports = await db.farmPassport.findMany({
    where: { farmerId, isActive: true },
    orderBy: { generatedAt: 'desc' },
  })

  return {
    farmer: {
      id: farmer.id,
      name: `${farmer.firstName} ${farmer.lastName}`,
      code: farmer.farmerCode,
      phone: farmer.phone,
      gender: farmer.gender,
    },
    organization: {
      name: farmer.tenant.name,
      country: farmer.tenant.country,
      type: farmer.tenant.type,
    },
    farms: farmer.farms.map((f) => ({
      id: f.id,
      name: f.name,
      sizeHectares: f.sizeHectares,
      crops: f.mainCrops,
    })),
    certifications: {
      eudr: farmer.eudrCompliances.map((e) => ({
        plotId: e.plotId,
        plotName: e.plotName,
        status: e.status,
        expiryDate: e.expiryDate,
      })),
      rainforestAlliance: farmer.rainforestCerts.map((r) => ({
        certificateNo: r.certificateNo,
        level: r.certificationLevel,
        expiryDate: r.expiryDate,
      })),
      globalGap: farmer.globalGapCerts.map((g) => ({
        certificateNo: g.certificateNo,
        scope: g.scope,
        expiryDate: g.expiryDate,
      })),
    },
    recentBatches: farmer.productBatches.map((b) => ({
      batchId: b.batchId,
      commodity: b.commodity,
      quantityKg: b.quantityKg,
      status: b.status,
      season: b.season,
    })),
    issuedCount: passports.length + 1,
  }
}

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const tenantFilter = buildTenantFilter(ctx)
    const { searchParams } = new URL(request.url)

    const farmerId = searchParams.get('farmerId')

    if (!farmerId) {
      return NextResponse.json({ error: 'farmerId is required' }, { status: 400 })
    }

    // Verify farmer access
    const farmer = await db.farmerProfile.findFirst({
      where: { id: farmerId, ...tenantFilter },
    })

    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
    }

    // Check for existing active passport
    const existingPassport = await db.farmPassport.findFirst({
      where: { farmerId, isActive: true },
      orderBy: { generatedAt: 'desc' },
    })

    if (existingPassport) {
      return NextResponse.json({
        ...existingPassport,
        passportData: JSON.parse(existingPassport.passportData),
      })
    }

    // No passport exists — return null to indicate needs generation
    return NextResponse.json({ exists: false, farmerId })
  } catch (error) {
    console.error('Farm passport get error:', error)
    return NextResponse.json({ error: 'Failed to fetch farm passport' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const tenantFilter = buildTenantFilter(ctx)
    const body = await request.json()
    const { farmerId } = body

    if (!farmerId) {
      return NextResponse.json({ error: 'farmerId is required' }, { status: 400 })
    }

    // Verify farmer access
    const farmer = await db.farmerProfile.findFirst({
      where: { id: farmerId, ...tenantFilter },
      include: { tenant: { select: { country: true } } },
    })

    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
    }

    // Build passport data
    const passportData = await buildPassportData(farmerId, ctx.tenantId)
    if (!passportData) {
      return NextResponse.json({ error: 'Failed to build passport data' }, { status: 500 })
    }

    // Deactivate any existing passports
    await db.farmPassport.updateMany({
      where: { farmerId, isActive: true },
      data: { isActive: false, regeneratedAt: new Date() },
    })

    // Generate passport ID
    const country = farmer.tenant?.country || 'Uganda'
    const passportId = generatePassportId(country)

    // Create new passport
    const passport = await db.farmPassport.create({
      data: {
        tenantId: ctx.tenantId,
        passportId,
        farmerId,
        passportData: JSON.stringify(passportData),
        qrCodeUrl: `/api/qr/${passportId}`,
        verificationUrl: `/api/traceability/passport/${passportId}/verify`,
      },
    })

    return NextResponse.json({
      ...passport,
      passportData,
    }, { status: 201 })
  } catch (error) {
    console.error('Farm passport generate error:', error)
    return NextResponse.json({ error: 'Failed to generate farm passport' }, { status: 500 })
  }
}