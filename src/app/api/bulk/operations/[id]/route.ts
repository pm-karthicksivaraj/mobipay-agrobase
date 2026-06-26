import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    const { id } = await params
    const filter = buildTenantFilter(ctx) as any
    const record = await db.bulkOperation.findFirst({ where: { id, ...filter } })
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
    const existing = await db.bulkOperation.findFirst({ where: { id, ...filter } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const body = await req.json()
    const { status, result, error } = body
    const record = await db.bulkOperation.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(result !== undefined && { result: typeof result === 'string' ? result : JSON.stringify(result) }),
        ...(error !== undefined && { error }),
        completedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : undefined,
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
    const existing = await db.bulkOperation.findFirst({ where: { id, ...filter } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // Soft-cancel: set status to CANCELLED
    const record = await db.bulkOperation.update({
      where: { id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    })
    return NextResponse.json({ data: record, message: 'Operation cancelled' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}