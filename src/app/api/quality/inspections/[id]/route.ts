import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    const { id } = await params
    const filter = buildTenantFilter(ctx) as any
    const record = await db.qualityInspection.findFirst({ where: { id, ...filter } })
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: record })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    const { id } = await params
    const filter = buildTenantFilter(ctx) as any
    const existing = await db.qualityInspection.findFirst({ where: { id, ...filter } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const body = await req.json()
    const { grade, notes, inspectorName, status } = body
    const record = await db.qualityInspection.update({
      where: { id },
      data: {
        ...(grade !== undefined && { grade }),
        ...(notes !== undefined && { notes }),
        ...(inspectorName !== undefined && { inspectorName }),
        ...(status !== undefined && { status }),
        updatedAt: new Date(),
      },
    })
    return NextResponse.json({ data: record })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    const { id } = await params
    const filter = buildTenantFilter(ctx) as any
    const existing = await db.qualityInspection.findFirst({ where: { id, ...filter } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // Soft-delete: mark as VOIDED
    const record = await db.qualityInspection.update({
      where: { id },
      data: { status: 'REJECTED', updatedAt: new Date() },
    })
    return NextResponse.json({ data: record, message: 'Inspection voided' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}