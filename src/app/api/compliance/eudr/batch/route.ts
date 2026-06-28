import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { EudrEngine } from '@/lib/eudr/engine'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!hasPermission(ctx.role, 'compliance:update')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'verify') {
      // batchVerify verifies all PENDING records for the tenant
      const result = await EudrEngine.batchVerify(ctx.tenantId)
      return NextResponse.json(result)
    }

    if (action === 'reject') {
      const plotIds: string[] = body.plotIds || []
      if (plotIds.length === 0) {
        return NextResponse.json({ error: 'plotIds array is required for action=reject' }, { status: 400 })
      }

      if (plotIds.length > 200) {
        return NextResponse.json({ error: 'Maximum 200 plots per batch' }, { status: 400 })
      }

      let rejected = 0
      let errors = 0
      const results: Array<{ plotId: string; status: string; reason: string }> = []

      for (const plotId of plotIds) {
        try {
          const record = await db.eudrCompliance.findFirst({
            where: { plotId, farmer: { tenantId: ctx.tenantId } },
          })

          if (!record) {
            errors++
            results.push({ plotId, status: 'NOT_FOUND', reason: 'No compliance record found for this plot' })
            continue
          }

          await db.eudrCompliance.update({
            where: { id: record.id },
            data: {
              status: 'REJECTED',
              verifiedBy: ctx.userId,
              verifiedAt: new Date(),
            },
          })

          await db.eudrAuditLog.create({
            data: {
              eudrComplianceId: record.id,
              action: 'REJECTED',
              performedBy: ctx.userId,
              details: 'Batch rejected via API',
            },
          })

          rejected++
          results.push({ plotId, status: 'REJECTED', reason: 'Batch rejected' })
        } catch {
          errors++
          results.push({ plotId, status: 'ERROR', reason: 'Failed to process' })
        }
      }

      return NextResponse.json({
        tenantId: ctx.tenantId,
        totalProcessed: plotIds.length,
        rejected,
        errors,
        results,
      })
    }

    return NextResponse.json({ error: 'action must be "verify" or "reject"' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process batch operation'
    console.error('EUDR batch error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}