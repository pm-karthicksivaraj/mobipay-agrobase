import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const relatedId = searchParams.get('relatedId') || ''
    const relatedType = searchParams.get('relatedType') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { tenantId: ctx.tenantId }
    if (relatedId) where.relatedId = relatedId
    if (relatedType) where.relatedType = relatedType
    const [data, total] = await Promise.all([
      db.fileAttachment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.fileAttachment.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const attachment = await db.fileAttachment.create({
      data: {
        tenantId: ctx.tenantId,
        relatedId: body.relatedId || null,
        relatedType: body.relatedType || null,
        fileName: body.fileName,
        fileType: body.fileType || null,
        fileSize: body.fileSize ?? null,
        fileUrl: body.fileUrl || null,
        uploadedBy: body.uploadedBy || null,
        description: body.description || null,
      },
    })
    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create attachment' }, { status: 500 })
  }
}