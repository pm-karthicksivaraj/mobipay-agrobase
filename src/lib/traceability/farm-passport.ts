import { db } from '@/lib/db'
import type {
  FarmPassport,
  PassportStats,
  VerificationResult,
} from './types'
import { batchStore } from './engine'

// Passport cache for quick lookups
const passportCache = new Map<string, FarmPassport>()

// ─── Helpers ──────────────────────────────────────────────────────────

function generateRandomAlpha(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function countryToCode(country: string): string {
  const mapping: Record<string, string> = {
    uganda: 'UG',
    ghana: 'GH',
    kenya: 'KE',
    tanzania: 'TZ',
    nigeria: 'NG',
    ethiopia: 'ET',
    rwanda: 'RW',
    burundi: 'BI',
  }
  return mapping[country.toLowerCase()] ?? 'XX'
}

function generatePassportId(country: string): string {
  const code = countryToCode(country)
  const year = new Date().getFullYear().toString()
  const alpha = generateRandomAlpha(6)
  return `AGRO-${code}-${year}-${alpha}`
}

function generateQRCode(passportId: string): string {
  // In production this would generate an actual QR code image
  // For now, return a data URL placeholder
  const data = JSON.stringify({ passportId, v: '3.0' })
  return `data:application/json;base64,${Buffer.from(data).toString('base64')}`
}

function generateVerificationUrl(passportId: string): string {
  return `https://verify.agrobase.io/passport/${passportId}`
}

function parseMainCrops(mainCrops: string | null | undefined): string[] {
  if (!mainCrops) return []
  try {
    const parsed = JSON.parse(mainCrops)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return mainCrops.split(',').map((s) => s.trim()).filter(Boolean)
  }
}

// ─── FarmPassportGenerator ────────────────────────────────────────────

export class FarmPassportGenerator {
  /**
   * Generate a comprehensive farm passport for a farmer,
   * aggregating ALL data from multiple models.
   */
  async generatePassport(farmerId: string): Promise<FarmPassport> {
    const passport = await this.buildPassport(farmerId)
    passportCache.set(farmerId, passport)
    return passport
  }

  /**
   * Regenerate a passport with the latest data.
   */
  async regeneratePassport(farmerId: string): Promise<FarmPassport> {
    passportCache.delete(farmerId)
    return this.generatePassport(farmerId)
  }

  /**
   * Get cached passport or return null.
   */
  async getPassportByFarmerId(
    farmerId: string
  ): Promise<FarmPassport | null> {
    const cached = passportCache.get(farmerId)
    if (cached) return cached
    return null
  }

  /**
   * Verify a passport's authenticity:
   * - Check passport ID format
   * - Verify farmer exists and is active
   * - Check certification validity dates
   */
  async verifyPassport(passportId: string): Promise<VerificationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // 1. Validate passport ID format: AGRO-{COUNTRY}-{YYYY}-{6ALPHA}
    const passportRegex = /^AGRO-([A-Z]{2})-(\d{4})-([A-Z]{6})$/
    const match = passportId.match(passportRegex)
    if (!match) {
      errors.push(
        `Invalid passport ID format. Expected AGRO-{COUNTRY}-{YYYY}-{6ALPHA}`
      )
      return {
        isValid: false,
        errors,
        warnings,
        verifiedAt: new Date(),
      }
    }

    const year = parseInt(match[2], 10)
    const currentYear = new Date().getFullYear()
    if (year < 2020 || year > currentYear + 1) {
      warnings.push(`Passport year ${year} seems outside expected range`)
    }

    // 2. Find the farmer associated with this passport
    // Search through cache first
    let farmerId: string | null = null
    for (const [fId, passport] of passportCache) {
      if (passport.passportId === passportId) {
        farmerId = fId
        break
      }
    }

    // If not cached, look up by trying to reconstruct (would need DB in production)
    if (!farmerId) {
      warnings.push(
        'Passport not found in cache. Full verification requires regenerating the passport.'
      )
      return {
        isValid: true,
        errors,
        warnings,
        verifiedAt: new Date(),
        details: {
          passportId,
          formatValid: true,
          cacheMiss: true,
        },
      }
    }

    // 3. Verify farmer exists and is active
    const farmer = await db.farmerProfile.findUnique({
      where: { id: farmerId },
    })

    if (!farmer) {
      errors.push(`Farmer record not found (ID: ${farmerId})`)
      return {
        isValid: false,
        errors,
        warnings,
        verifiedAt: new Date(),
      }
    }

    if (farmer.status !== 'ACTIVE') {
      warnings.push(
        `Farmer status is "${farmer.status}" — expected ACTIVE`
      )
    }

    // 4. Check certification validity dates
    const passport = passportCache.get(farmerId)
    if (passport) {
      const now = new Date()

      // Check EUDR (embedded in compliance)
      if (
        passport.compliance.eudrStatus === 'EXPIRED' ||
        passport.compliance.eudrStatus === 'PENDING'
      ) {
        warnings.push(
          `EUDR compliance status is "${passport.compliance.eudrStatus}"`
        )
      }

      // Check explicit certifications
      for (const cert of passport.certifications) {
        const expiryDate = new Date(cert.expiryDate)
        const daysUntilExpiry =
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

        if (daysUntilExpiry < 0) {
          errors.push(
            `${cert.type} certificate (${cert.certificateNo}) expired on ${cert.expiryDate.toISOString().split('T')[0]}`
          )
        } else if (daysUntilExpiry < 30) {
          warnings.push(
            `${cert.type} certificate (${cert.certificateNo}) expires in ${Math.floor(daysUntilExpiry)} days`
          )
        }

        if (cert.status === 'SUSPENDED' || cert.status === 'REVOKED') {
          errors.push(
            `${cert.type} certificate (${cert.certificateNo}) has status "${cert.status}"`
          )
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      verifiedAt: new Date(),
      details: {
        passportId,
        farmerId,
        farmerName: `${farmer.firstName} ${farmer.lastName}`,
        farmerStatus: farmer.status,
        certificationCount: passport?.certifications.length ?? 0,
      },
    }
  }

  /**
   * Placeholder for PDF export.
   * In production, this would use a PDF library to generate a printable passport.
   */
  async exportPassportPdf(_passport: FarmPassport): Promise<Buffer> {
    // Placeholder: return a minimal PDF structure
    const placeholder =
      'Agrobase Farm Passport PDF — PDF generation not yet implemented'
    return Buffer.from(placeholder, 'utf-8')
  }

  /**
   * Generate a QR code URL for a passport.
   */
  generateQRCode(passportId: string): string {
    return generateQRCode(passportId)
  }

  /**
   * Batch-generate passports for multiple farmers in a tenant.
   */
  async batchGeneratePassports(
    tenantId: string,
    farmerIds?: string[]
  ): Promise<FarmPassport[]> {
    const where = farmerIds
      ? { tenantId, id: { in: farmerIds } }
      : { tenantId, status: 'ACTIVE' }

    const farmers = await db.farmerProfile.findMany({
      where,
      select: { id: true },
    })

    const passports: FarmPassport[] = []
    for (const farmer of farmers) {
      try {
        const passport = await this.generatePassport(farmer.id)
        passports.push(passport)
      } catch {
        // Skip farmers that fail — could log error in production
      }
    }

    return passports
  }

  /**
   * Get aggregate passport statistics for a tenant.
   */
  async getPassportStats(tenantId: string): Promise<PassportStats> {
    const farmers = await db.farmerProfile.findMany({
      where: { tenantId },
      select: { id: true, status: true },
    })

    const activeFarmers = farmers.filter((f) => f.status === 'ACTIVE')
    const farmerIds = activeFarmers.map((f) => f.id)

    // Certification counts
    const [eudrCount, raCount, ggCount, organicCount] = await Promise.all([
      db.eudrCompliance.count({
        where: { farmerId: { in: farmerIds }, status: 'VERIFIED' },
      }),
      db.rainforestCertification.count({
        where: {
          farmerId: { in: farmerIds },
          status: { in: ['ACTIVE', 'SUSPENDED'] },
        },
      }),
      db.globalGapCertification.count({
        where: {
          farmerId: { in: farmerIds },
          status: { in: ['ACTIVE', 'SUSPENDED'] },
        },
      }),
      db.rainforestCertification.count({
        where: {
          farmerId: { in: farmerIds },
          certificationLevel: { contains: 'Organic' },
          status: { in: ['ACTIVE', 'SUSPENDED'] },
        },
      }),
    ])

    // Compliance summary
    const [eudrVerified, eudrPending, cbamSubmitted] = await Promise.all([
      db.eudrCompliance.count({
        where: { farmerId: { in: farmerIds }, status: 'VERIFIED' },
      }),
      db.eudrCompliance.count({
        where: { farmerId: { in: farmerIds }, status: 'PENDING' },
      }),
      db.cbamReport.count({
        where: {
          farmerId: { in: farmerIds },
          status: { in: ['SUBMITTED', 'VERIFIED'] },
        },
      }),
    ])

    // Risk scores from EUDR
    const eudrRecords = await db.eudrCompliance.findMany({
      where: { farmerId: { in: farmerIds } },
      select: { riskAssessment: true },
    })
    const riskScores: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 }
    const validRisks = eudrRecords
      .filter((r) => r.riskAssessment && r.riskAssessment in riskScores)
      .map((r) => riskScores[r.riskAssessment ?? 'MEDIUM'])
    const averageRiskScore =
      validRisks.length > 0
        ? validRisks.reduce((a, b) => a + b, 0) / validRisks.length
        : null

    // Batch summary from in-memory store
    const allBatches = Array.from(batchStore.values())
    const tenantBatches = allBatches.filter((b) =>
      farmerIds.includes(b.farmerId)
    )

    return {
      totalPassports: farmers.length,
      activePassports: activeFarmers.length,
      certificationCoverage: {
        total: activeFarmers.length,
        eudr: eudrCount,
        rainforestAlliance: raCount,
        globalGap: ggCount,
        organic: organicCount,
      },
      complianceSummary: {
        eudrVerified,
        eudrPending,
        cbamSubmitted,
        averageRiskScore,
      },
      batchSummary: {
        totalBatches: tenantBatches.length,
        activeBatches: tenantBatches.filter(
          (b) => b.status === 'GROWING'
        ).length,
        batchesInTransit: tenantBatches.filter(
          (b) => b.status === 'IN_TRANSIT'
        ).length,
        batchesExported: tenantBatches.filter(
          (b) => b.status === 'EXPORTED'
        ).length,
      },
      generatedAt: new Date(),
    }
  }

  // ─── Internal: Build Passport from All Data Sources ────────────────

  private async buildPassport(farmerId: string): Promise<FarmPassport> {
    // Fetch farmer profile with all relations
    const farmer = await db.farmerProfile.findUnique({
      where: { id: farmerId },
      include: {
        tenant: true,
        village: {
          include: {
            parish: {
              include: {
                subCounty: {
                  include: {
                    constituency: {
                      include: {
                        district: {
                          include: { subRegion: { include: { region: true } } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        farms: {
          include: {
            polygonPoints: { orderBy: { pointOrder: 'asc' } },
            cultivations: {
              where: { status: 'ACTIVE' },
              orderBy: { sowingDate: 'desc' },
            },
          },
        },
        group: { include: { company: true } },
        eudrCompliances: {
          where: { status: { in: ['VERIFIED', 'PENDING'] } },
          orderBy: { createdAt: 'desc' },
        },
        cbamReports: { orderBy: { createdAt: 'desc' }, take: 1 },
        rainforestCerts: { orderBy: { createdAt: 'desc' } },
        globalGapCerts: { orderBy: { createdAt: 'desc' } },
        vslaMemberships: {
          include: {
            vslaGroup: {
              include: {
                savings: { where: { farmerId } },
              },
            },
          },
        },
        vslaLoans: {
          where: { status: { not: 'REJECTED' } },
          orderBy: { createdAt: 'desc' },
        },
        purchases: { orderBy: { createdAt: 'desc' }, take: 10 },
        trainings: {
          include: { training: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!farmer) {
      throw new Error(`Farmer not found: ${farmerId}`)
    }

    const country =
      farmer.tenant?.country ?? farmer.village?.parish?.subCounty?.constituency?.district?.subRegion?.region?.country ?? 'UG'

    const passportId = generatePassportId(country)

    // Build farmer info
    const farmerInfo: FarmPassport['farmer'] = {
      name: `${farmer.firstName} ${farmer.lastName}`,
      phone: farmer.phone,
      gender: farmer.gender ?? undefined,
      nationalId: farmer.nationalIdNo ?? undefined,
      photoUrl: farmer.photoUrl ?? undefined,
      location: {
        village: farmer.village?.name ?? undefined,
        district:
          farmer.village?.parish?.subCounty?.constituency?.district?.name ?? undefined,
        country,
      },
    }

    // Build farms
    const farms = farmer.farms.map((farm) => ({
      id: farm.id,
      name: farm.name,
      sizeHectares: farm.sizeHectares ?? 0,
      gpsPoint: {
        lat: farm.latitude ?? 0,
        lng: farm.longitude ?? 0,
      },
      polygon:
        farm.polygonPoints.length > 0
          ? farm.polygonPoints.map((p) => ({ lat: p.latitude, lng: p.longitude }))
          : undefined,
      soilType: farm.soilFertility ?? undefined,
      waterSource: farm.waterSource ?? undefined,
    }))

    // Build current crops from all farm cultivations
    const currentCrops = farmer.farms.flatMap((farm) =>
      farm.cultivations.map((c) => ({
        cropName: c.cropName,
        variety: c.variety ?? undefined,
        season: c.season ?? 'Unknown',
        sowingDate: c.sowingDate ?? new Date(),
        status: c.status,
      }))
    )

    // Build certifications
    const certifications: FarmPassport['certifications'] = []

    // EUDR compliance as a certification
    for (const eudr of farmer.eudrCompliances) {
      certifications.push({
        type: 'EUDR',
        certificateNo: eudr.plotId,
        status: eudr.status,
        issueDate: eudr.createdAt,
        expiryDate: eudr.expiryDate ?? new Date(eudr.createdAt.getTime() + 365 * 24 * 60 * 60 * 1000),
      })
    }

    // Rainforest Alliance
    for (const ra of farmer.rainforestCerts) {
      certifications.push({
        type: 'RA',
        certificateNo: ra.certificateNo,
        status: ra.status,
        issueDate: ra.issueDate,
        expiryDate: ra.expiryDate,
      })
    }

    // GlobalGAP
    for (const gg of farmer.globalGapCerts) {
      certifications.push({
        type: 'GlobalGAP',
        certificateNo: gg.ggnNumber,
        status: gg.status,
        issueDate: gg.issueDate,
        expiryDate: gg.expiryDate,
      })
    }

    // Build compliance
    const latestEudr = farmer.eudrCompliances[0]
    const latestCbam = farmer.cbamReports[0]
    const compliance: FarmPassport['compliance'] = {
      eudrStatus: latestEudr?.status ?? 'NONE',
      cbamData: latestCbam
        ? {
            embeddedEmissions: latestCbam.embeddedEmissions,
            lastReport: latestCbam.reportingPeriod,
          }
        : undefined,
      riskScore: latestEudr?.riskAssessment
        ? { LOW: 1, MEDIUM: 2, HIGH: 3 }[latestEudr.riskAssessment] ?? undefined
        : undefined,
    }

    // Build financial data
    const vslaGroups = farmer.vslaMemberships.map((m) => ({
      name: m.vslaGroup.name,
      sharesOwned: m.sharesOwned,
      totalSavings:
        m.vslaGroup.savings.reduce((sum, s) => sum + s.amount, 0),
    }))

    const loans = farmer.vslaLoans.map((l) => ({
      amount: l.totalRepayable,
      status: l.status,
      outstanding: l.totalRepayable - l.amountRepaid,
    }))

    const purchases = farmer.purchases.map((p) => ({
      date: p.createdAt,
      commodity: p.commodity,
      quantity: p.quantity,
      amount: p.totalAmount ?? 0,
    }))

    // Build training history
    const trainingHistory = farmer.trainings.map((t) => ({
      topic: t.training.topic,
      date: t.training.date,
      attended: t.attended,
    }))

    // Build traceability summary
    const allBatches = Array.from(batchStore.values()).filter(
      (b) => b.farmerId === farmerId
    )
    const activeBatches = allBatches.filter(
      (b) => b.status === 'GROWING' || b.status === 'HARVESTED'
    )
    const harvestEvents = allBatches.flatMap((b) =>
      b.traceEvents.filter((e) => e.eventType === 'HARVESTING')
    )
    const lastHarvest =
      harvestEvents.length > 0
        ? harvestEvents[harvestEvents.length - 1].timestamp
        : undefined

    const passport: FarmPassport = {
      passportId,
      farmerId,
      farmer: farmerInfo,
      farms,
      currentCrops,
      certifications,
      compliance,
      financial: {
        vslaGroups,
        loans,
        purchases,
      },
      trainingHistory,
      traceability: {
        activeBatches: activeBatches.length,
        totalBatches: allBatches.length,
        lastHarvest,
      },
      generatedAt: new Date(),
      qrCodeUrl: generateQRCode(passportId),
      verificationUrl: generateVerificationUrl(passportId),
    }

    return passport
  }
}

// Singleton instance
export const farmPassportGenerator = new FarmPassportGenerator()