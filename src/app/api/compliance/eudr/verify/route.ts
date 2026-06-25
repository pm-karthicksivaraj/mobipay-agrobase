import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'
import { NextResponse } from 'next/server'

const REQUIRED_DOCUMENT_TYPES = ['LAND_TITLE', 'USE_RIGHTS', 'ENVIRONMENTAL_PERMIT', 'SURVEY_MAP']

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const { eudrComplianceId, action, notes } = body

    if (!eudrComplianceId || !action) {
      return NextResponse.json({ error: 'eudrComplianceId and action are required' }, { status: 400 })
    }

    const validActions = ['verify', 'reject', 'renew']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, { status: 400 })
    }

    // Verify access
    const compliance = await db.eudrCompliance.findFirst({
      where: { id: eudrComplianceId },
      include: {
        farmer: { select: { tenantId: true } },
        documents: true,
      },
    })

    if (!compliance) {
      return NextResponse.json({ error: 'EUDR compliance record not found' }, { status: 404 })
    }

    if (!ctx.isSuperAdmin && compliance.farmer && !ctx.tenantScope.includes(compliance.farmer.tenantId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Handle different actions
    if (action === 'verify') {
      // Check all required documents are present and verified
      const presentTypes = compliance.documents.map((d) => d.documentType)
      const missingTypes = REQUIRED_DOCUMENT_TYPES.filter((t) => !presentTypes.includes(t))
      const unverifiedDocs = compliance.documents.filter((d) => !d.verified)

      if (missingTypes.length > 0) {
        return NextResponse.json({
          error: 'Cannot verify: missing required documents',
          missingTypes,
          requiredTypes: REQUIRED_DOCUMENT_TYPES,
        }, { status: 400 })
      }

      if (unverifiedDocs.length > 0) {
        return NextResponse.json({
          error: 'Cannot verify: some documents are not verified',
          unverifiedDocuments: unverifiedDocs.map((d) => d.fileName),
        }, { status: 400 })
      }

      if (!compliance.deforestationFree) {
        return NextResponse.json({
          error: 'Cannot verify: deforestation-free status must be confirmed',
        }, { status: 400 })
      }

      // Update status
      const updated = await db.eudrCompliance.update({
        where: { id: eudrComplianceId },
        data: {
          status: 'VERIFIED',
          verifiedBy: ctx.userId,
          verifiedAt: new Date(),
          expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        },
        include: { farmer: true, documents: true },
      })

      // Create audit log
      await db.eudrAuditLog.create({
        data: {
          eudrComplianceId,
          action: 'VERIFIED',
          performedBy: ctx.userId,
          details: notes || 'EUDR compliance verified. All required documents present and verified.',
        },
      })

      return NextResponse.json(updated)
    }

    if (action === 'reject') {
      const updated = await db.eudrCompliance.update({
        where: { id: eudrComplianceId },
        data: {
          status: 'REJECTED',
          verifiedBy: ctx.userId,
          verifiedAt: new Date(),
        },
        include: { farmer: true, documents: true },
      })

      await db.eudrAuditLog.create({
        data: {
          eudrComplianceId,
          action: 'REJECTED',
          performedBy: ctx.userId,
          details: notes || 'EUDR compliance rejected.',
        },
      })

      return NextResponse.json(updated)
    }

    if (action === 'renew') {
      const updated = await db.eudrCompliance.update({
        where: { id: eudrComplianceId },
        data: {
          status: 'PENDING',
          expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        },
        include: { farmer: true, documents: true },
      })

      await db.eudrAuditLog.create({
        data: {
          eudrComplianceId,
          action: 'RENEWED',
          performedBy: ctx.userId,
          details: notes || 'EUDR compliance renewal initiated.',
        },
      })

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Unexpected action' }, { status: 400 })
  } catch (error) {
    console.error('EUDR verify error:', error)
    return NextResponse.json({ error: 'Failed to process verification action' }, { status: 500 })
  }
}