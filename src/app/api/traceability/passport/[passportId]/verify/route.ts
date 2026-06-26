import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ passportId: string }> },
) {
  try {
    const { passportId } = await params

    const passport = await db.farmPassport.findFirst({
      where: { passportId, isActive: true },
      include: {
        farmer: {
          include: {
            tenant: { select: { name: true, country: true, type: true } },
            eudrCompliances: { where: { status: 'VERIFIED' } },
            rainforestCerts: true,
            globalGapCerts: true,
          },
        },
      },
    })

    if (!passport) {
      return NextResponse.json({
        valid: false,
        error: 'Passport not found or inactive',
      }, { status: 404 })
    }

    const passportData = JSON.parse(passport.passportData)
    const farmer = passport.farmer

    // Build warnings
    const warnings: string[] = []

    // Check for expiring EUDR certifications
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    for (const eudr of farmer.eudrCompliances) {
      if (eudr.expiryDate && eudr.expiryDate <= thirtyDaysFromNow) {
        warnings.push(`EUDR compliance for plot "${eudr.plotName}" expires on ${eudr.expiryDate.toISOString().split('T')[0]}`)
      }
    }

    // Check for expired rainforest certs
    for (const cert of farmer.rainforestCerts) {
      if (cert.expiryDate <= new Date()) {
        warnings.push(`Rainforest Alliance certificate ${cert.certificateNo} has expired`)
      }
    }

    // Check for expired GlobalGAP certs
    for (const cert of farmer.globalGapCerts) {
      if (cert.expiryDate <= new Date()) {
        warnings.push(`GLOBALG.A.P. certificate ${cert.certificateNo} has expired`)
      }
    }

    return NextResponse.json({
      valid: true,
      passport: {
        passportId: passport.passportId,
        issueDate: passport.generatedAt,
        lastRegenerated: passport.regeneratedAt,
      },
      farmer: {
        name: `${farmer.firstName} ${farmer.lastName}`,
        code: farmer.farmerCode,
        organization: farmer.tenant.name,
        country: farmer.tenant.country,
      },
      certifications: {
        eudrCompliant: farmer.eudrCompliances.length > 0,
        eudrPlots: farmer.eudrCompliances.length,
        rainforestAlliance: farmer.rainforestCerts.length > 0,
        globalGap: farmer.globalGapCerts.length > 0,
      },
      warnings,
      data: passportData,
    })
  } catch (error) {
    console.error('Passport verify error:', error)
    return NextResponse.json({ error: 'Failed to verify passport' }, { status: 500 })
  }
}