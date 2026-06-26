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
    const { action, eudrComplianceId, plotIds } = body

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    // Single submission
    if (action === 'submit') {
      if (!eudrComplianceId) {
        return NextResponse.json({ error: 'eudrComplianceId is required for action=submit' }, { status: 400 })
      }

      // Verify access through farmer tenant
      const compliance = await (await import('@/lib/db')).db.eudrCompliance.findFirst({
        where: { id: eudrComplianceId },
        include: { farmer: { select: { tenantId: true } } },
      })

      if (!compliance) {
        return NextResponse.json({ error: 'EUDR compliance record not found' }, { status: 404 })
      }

      if (!ctx.isSuperAdmin && compliance.farmer && !ctx.tenantScope.includes(compliance.farmer.tenantId)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      const result = await EudrEngine.submitToTraces(eudrComplianceId, ctx.userId, {
        operatorName: body.operatorName,
        operatorEori: body.operatorEori,
        customsReference: body.customsReference,
      })

      return NextResponse.json(result, { status: 201 })
    }

    // Batch submission
    if (action === 'batch-submit') {
      if (!hasPermission(ctx.role, 'compliance:manage')) {
        return NextResponse.json({ error: 'Insufficient permissions for batch submit' }, { status: 403 })
      }

      const result = await EudrEngine.batchSubmitToTraces(ctx.tenantId, ctx.userId, plotIds)
      return NextResponse.json(result, { status: 201 })
    }

    // Retry failed submission
    if (action === 'retry') {
      if (!eudrComplianceId) {
        return NextResponse.json({ error: 'eudrComplianceId is required for action=retry' }, { status: 400 })
      }

      const result = await EudrEngine.retryTracesSubmission(eudrComplianceId, ctx.userId)
      return NextResponse.json(result, { status: 200 })
    }

    return NextResponse.json({ error: `Unknown action: ${action}. Use 'submit', 'batch-submit', or 'retry'.` }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process TRACES submission'
    console.error('EUDR TRACES submit error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}