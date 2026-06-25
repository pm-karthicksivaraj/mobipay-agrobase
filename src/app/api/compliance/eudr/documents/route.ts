import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)

    const eudrComplianceId = searchParams.get('eudrComplianceId')

    if (!eudrComplianceId) {
      return NextResponse.json({ error: 'eudrComplianceId is required' }, { status: 400 })
    }

    // Verify access through the compliance record's farmer tenant
    const compliance = await db.eudrCompliance.findFirst({
      where: { id: eudrComplianceId },
      include: { farmer: { select: { tenantId: true } } },
    })

    if (!compliance) {
      return NextResponse.json({ error: 'EUDR compliance record not found' }, { status: 404 })
    }

    if (!ctx.isSuperAdmin && compliance.farmer && !ctx.tenantScope.includes(compliance.farmer.tenantId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const documents = await db.eudrDocument.findMany({
      where: { eudrComplianceId },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json({ data: documents, total: documents.length })
  } catch (error) {
    console.error('EUDR documents list error:', error)
    return NextResponse.json({ error: 'Failed to fetch EUDR documents' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const { eudrComplianceId, documentType, fileName, fileUrl, fileSize } = body

    if (!eudrComplianceId || !documentType || !fileName) {
      return NextResponse.json(
        { error: 'eudrComplianceId, documentType, and fileName are required' },
        { status: 400 },
      )
    }

    const validTypes = ['LAND_TITLE', 'USE_RIGHTS', 'ENVIRONMENTAL_PERMIT', 'SURVEY_MAP', 'OTHER']
    if (!validTypes.includes(documentType)) {
      return NextResponse.json({ error: `Invalid documentType. Must be one of: ${validTypes.join(', ')}` }, { status: 400 })
    }

    // Verify access
    const compliance = await db.eudrCompliance.findFirst({
      where: { id: eudrComplianceId },
      include: { farmer: { select: { tenantId: true } } },
    })

    if (!compliance) {
      return NextResponse.json({ error: 'EUDR compliance record not found' }, { status: 404 })
    }

    if (!ctx.isSuperAdmin && compliance.farmer && !ctx.tenantScope.includes(compliance.farmer.tenantId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const doc = await db.eudrDocument.create({
      data: {
        eudrComplianceId,
        documentType,
        fileName,
        fileUrl: fileUrl || null,
        fileSize: fileSize || null,
      },
    })

    // Audit log
    await db.eudrAuditLog.create({
      data: {
        eudrComplianceId,
        action: 'RENEWED',
        performedBy: ctx.userId,
        details: `Document uploaded: ${documentType} - ${fileName}`,
      },
    })

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error('EUDR document upload error:', error)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const docId = searchParams.get('id')

    if (!docId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Verify access through the document's compliance record
    const doc = await db.eudrDocument.findFirst({
      where: { id: docId },
      include: {
        eudrCompliance: {
          include: { farmer: { select: { tenantId: true } } },
        },
      },
    })

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (!ctx.isSuperAdmin && doc.eudrCompliance.farmer && !ctx.tenantScope.includes(doc.eudrCompliance.farmer.tenantId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await db.eudrDocument.delete({ where: { id: docId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('EUDR document delete error:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}