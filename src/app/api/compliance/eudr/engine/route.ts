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
    const { farmerId, plotData } = body

    if (!farmerId || !plotData?.plotId) {
      return NextResponse.json({ error: 'farmerId and plotData.plotId are required' }, { status: 400 })
    }

    // Verify farmer belongs to tenant
    const farmer = await db.farmerProfile.findFirst({
      where: { id: farmerId, tenantId: ctx.tenantId },
    })
    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found or access denied' }, { status: 404 })
    }

    const result = await EudrEngine.submitDueDiligence(farmerId, plotData)
    return NextResponse.json(result, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit due diligence'
    console.error('EUDR engine submit error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)

    const action = searchParams.get('action')

    if (action === 'farmer-status') {
      const farmerId = searchParams.get('farmerId')
      if (!farmerId) {
        return NextResponse.json({ error: 'farmerId is required' }, { status: 400 })
      }

      // Verify farmer belongs to tenant
      const farmer = await db.farmerProfile.findFirst({
        where: { id: farmerId, tenantId: ctx.tenantId },
      })
      if (!farmer) {
        return NextResponse.json({ error: 'Farmer not found' }, { status: 404 })
      }

      const status = await EudrEngine.getFarmerComplianceStatus(farmerId)
      return NextResponse.json(status)
    }

    if (action === 'report') {
      const period = searchParams.get('period') || `${new Date().getFullYear()}-H1`
      const report = await EudrEngine.generateComplianceReport(ctx.tenantId)
      return NextResponse.json(report)
    }

    // No action — return available engine capabilities
    return NextResponse.json({
      actions: [
        { action: 'farmer-status', method: 'GET', params: ['farmerId'], description: 'Get farmer EUDR compliance summary' },
        { action: 'report', method: 'GET', params: ['period'], description: 'Generate EUDR compliance report' },
        { action: 'submit', method: 'POST', description: 'Submit full due diligence for a plot' },
      ],
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process EUDR engine request'
    console.error('EUDR engine get error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}