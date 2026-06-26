import { db } from '@/lib/db'
import { CbamEngine } from '@/lib/cbam'
import { NextResponse } from 'next/server'

function getCurrentPeriod(frequency: string): string | null {
  const now = new Date()
  const year = now.getFullYear()
  const quarter = Math.ceil((now.getMonth() + 1) / 3)

  switch (frequency) {
    case 'QUARTERLY':
      return `${year}-Q${quarter}`
    case 'SEMI_ANNUALLY':
      return `${year}-${quarter <= 2 ? 'H1' : 'H2'}`
    case 'ANNUALLY':
      // Generate in January for the previous year
      if (now.getMonth() === 0) {
        return `${year - 1}-ANNUAL`
      }
      return null
    default:
      return null
  }
}

export async function POST() {
  try {
    const schedules = CbamEngine.getSchedules()

    if (schedules.length === 0) {
      return NextResponse.json({
        success: true,
        summary: { total: 0, generated: 0, failed: 0, skipped: 0 },
        results: [],
      })
    }

    // Resolve tenant names
    const tenantIds = [...new Set(schedules.map((s) => s.tenantId))]
    const tenants = await db.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true },
    })
    const tenantMap = new Map(tenants.map((t) => [t.id, t.name]))

    const results: Array<{
      tenantId: string
      tenantName: string
      period: string
      success: boolean
      reportId?: string
      error?: string
    }> = []

    for (const schedule of schedules) {
      const period = getCurrentPeriod(schedule.frequency)
      if (!period) continue

      try {
        const report = await CbamEngine.generateReport(schedule.tenantId, {
          period,
          autoValidate: true,
        })
        results.push({
          tenantId: schedule.tenantId,
          tenantName: tenantMap.get(schedule.tenantId) ?? schedule.tenantId,
          period,
          success: true,
          reportId: report.id,
        })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          tenantId: schedule.tenantId,
          tenantName: tenantMap.get(schedule.tenantId) ?? schedule.tenantId,
          period,
          success: false,
          error: message,
        })
      }
    }

    const generated = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length
    const skipped = schedules.length - results.length

    return NextResponse.json({
      success: true,
      summary: {
        total: schedules.length,
        generated,
        failed,
        skipped,
      },
      results,
    })
  } catch (error) {
    console.error('CBAM cron generate error:', error)
    return NextResponse.json({ error: 'Failed to run CBAM auto-generation' }, { status: 500 })
  }
}