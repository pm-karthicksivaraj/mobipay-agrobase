import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const filter = buildTenantFilter(ctx)
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
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const filter = buildTenantFilter(ctx)
    const existing = await db.qualityInspection.findFirst({ where: { id, ...filter } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const body = await req.json()
    const record = await db.qualityInspection.update({ where: { id }, data: body })
    return NextResponse.json({ data: record })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const filter = buildTenantFilter(ctx)
    const existing = await db.qualityInspection.findFirst({ where: { id, ...filter } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status !== 'PENDING') return NextResponse.json({ error: 'Inspection already processed' }, { status: 400 })
    const status = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : null
    if (!status) return NextResponse.json({ error: 'Invalid action. Use approve or reject' }, { status: 400 })
    const record = await db.qualityInspection.update({ where: { id }, data: { status } })
    return NextResponse.json({ data: record })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}