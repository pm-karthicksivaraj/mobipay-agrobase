import { db } from '@/lib/db'
import { EudrEngine } from '@/lib/eudr/engine'
import { NextResponse } from 'next/server'

/**
 * EUDR Automated Monitoring Cron
 *
 * Runs comprehensive EUDR compliance monitoring:
 *   1. Expiring records (next 30 days) — notification-ready
 *   2. Auto-expire VERIFIED records past expiry date
 *   3. Stale PENDING records (older than 90 days)
 *   4. Deforestation re-checks for VERIFIED records (satellite)
 *   5. TRACES submission status polling for failed submissions
 */
export async function POST() {
  try {
    const now = new Date()

    // ── Check 1: Find expiring compliance records (next 30 days) ──
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const expiring = await db.eudrCompliance.findMany({
      where: {
        status: 'VERIFIED',
        expiryDate: { gt: now, lte: thirtyDaysFromNow },
      },
      include: {
        farmer: { select: { id: true, firstName: true, lastName: true, tenantId: true } },
      },
      orderBy: { expiryDate: 'asc' },
    })

    // ── Check 2: Expire VERIFIED records past expiry date ──
    const expiredRecords = await db.eudrCompliance.findMany({
      where: {
        status: 'VERIFIED',
        expiryDate: { lt: now },
      },
    })

    let expiredCount = 0
    for (const record of expiredRecords) {
      await db.eudrCompliance.update({
        where: { id: record.id },
        data: { status: 'EXPIRED' },
      })
      await db.eudrAuditLog.create({
        data: {
          eudrComplianceId: record.id,
          action: 'EXPIRED',
          performedBy: 'system:cron',
          details: 'Automatically expired — expiry date passed',
        },
      })
      expiredCount++
    }

    // ── Check 3: Find stale PENDING records (older than 90 days) ──
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const stalePending = await db.eudrCompliance.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: ninetyDaysAgo },
      },
      include: {
        farmer: { select: { id: true, firstName: true, lastName: true, tenantId: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // ── Check 4: Deforestation re-checks for VERIFIED high-risk plots ──
    // Only re-check records that haven't been checked in the last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const highRiskVerified = await db.eudrCompliance.findMany({
      where: {
        status: 'VERIFIED',
        riskAssessment: { in: ['HIGH', 'CRITICAL'] },
        auditLogs: {
          none: {
            action: 'DEFORESTATION_RECHECK',
            performedAt: { gte: thirtyDaysAgo },
          },
        },
      },
      select: { id: true, plotId: true, plotName: true, geolocation: true },
      take: 20, // Limit per run to avoid overloading satellite APIs
    })

    let rechecked = 0
    let recheckAlerts = 0
    const recheckResults: Array<{
      plotId: string
      plotName: string
      deforestationFree: boolean
      severity: string
    }> = []

    for (const record of highRiskVerified) {
      try {
        // Extract polygon from geolocation
        let points: Array<{ lat: number; lng: number }> = []
        try {
          const parsed = JSON.parse(record.geolocation) as Record<string, unknown>
          const coordinates = (parsed.coordinates as number[][][])?.[0] ?? []
          points = coordinates.map(([lng, lat]) => ({ lat: lat as number, lng }))
        } catch { /* skip if invalid */ }

        if (points.length >= 3) {
          const result = await EudrEngine.checkDeforestation(points)

          await db.eudrAuditLog.create({
            data: {
              eudrComplianceId: record.id,
              action: 'DEFORESTATION_RECHECK',
              performedBy: 'system:cron',
              details: `Satellite re-check: ${result.deforestationFree ? 'deforestation-free' : 'deforestation detected'} (severity: ${result.severity}, area: ${result.areaAffectedHectares.toFixed(2)}ha, confidence: ${(result.confidence * 100).toFixed(0)}%)`,
            },
          })

          rechecked++
          recheckResults.push({
            plotId: record.plotId,
            plotName: record.plotName,
            deforestationFree: result.deforestationFree,
            severity: result.severity,
          })

          // If deforestation detected, flag the record
          if (!result.deforestationFree && (result.severity === 'HIGH' || result.severity === 'CRITICAL')) {
            recheckAlerts++
            await db.eudrCompliance.update({
              where: { id: record.id },
              data: {
                deforestationFree: false,
                deforestationDate: result.detectionDate,
              },
            })

            await db.eudrAuditLog.create({
              data: {
                eudrComplianceId: record.id,
                action: 'ALERT',
                performedBy: 'system:cron',
                details: `DEFORTESTATION ALERT: Satellite re-check detected ${result.severity} severity deforestation (${result.areaAffectedHectares.toFixed(2)}ha). Immediate review required.`,
              },
            })
          }
        }
      } catch (error) {
        console.error(`Deforestation re-check failed for ${record.plotId}:`, error)
      }
    }

    // ── Check 5: TRACES submission status polling ──
    // Find recent FAILED submissions that might be retryable
    const recentFailures = await db.eudrAuditLog.findMany({
      where: {
        action: 'SUBMITTED',
        details: { contains: 'Status: FAILED' },
        performedAt: { gte: thirtyDaysAgo },
      },
      select: {
        eudrComplianceId: true,
        performedAt: true,
        details: true,
      },
      distinct: ['eudrComplianceId'],
      take: 10,
    })

    const tracesRetryCandidates: Array<{
      eudrComplianceId: string
      failedAt: Date
    }> = recentFailures.map((f) => ({
      eudrComplianceId: f.eudrComplianceId,
      failedAt: f.performedAt,
    }))

    return NextResponse.json({
      runAt: now.toISOString(),
      checks: {
        expiring: {
          count: expiring.length,
          records: expiring.map((r) => ({
            id: r.id,
            plotId: r.plotId,
            plotName: r.plotName,
            farmerName: r.farmer ? `${r.farmer.firstName} ${r.farmer.lastName}` : null,
            expiryDate: r.expiryDate,
            daysRemaining: Math.ceil((r.expiryDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
          })),
        },
        expired: expiredCount,
        stalePending: {
          count: stalePending.length,
          records: stalePending.map((r) => ({
            id: r.id,
            plotId: r.plotId,
            plotName: r.plotName,
            farmerName: r.farmer ? `${r.farmer.firstName} ${r.farmer.lastName}` : null,
            createdAt: r.createdAt,
            daysPending: Math.ceil((now.getTime() - r.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
          })),
        },
        deforestationRecheck: {
          checked: rechecked,
          alerts: recheckAlerts,
          results: recheckResults,
        },
        tracesRetryCandidates: {
          count: tracesRetryCandidates.length,
          candidates: tracesRetryCandidates,
        },
      },
      summary: {
        totalIssues: expiring.length + expiredCount + stalePending.length + recheckAlerts,
        requiresAttention: (expiring.length + recheckAlerts) > 0,
      },
    })
  } catch (error) {
    console.error('EUDR monitor cron error:', error)
    return NextResponse.json({ error: 'Failed to run EUDR monitoring' }, { status: 500 })
  }
}