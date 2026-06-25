import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const filter = buildTenantFilter(ctx)
    const record = await db.contract.findFirst({ where: { id, ...filter }, include: { items: true, milestones: true } })
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
    const existing = await db.contract.findFirst({ where: { id, ...filter } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const body = await req.json()
    const record = await db.contract.update({ where: { id }, data: body })
    return NextResponse.json({ data: record })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const filter = buildTenantFilter(ctx)
    const existing = await db.contract.findFirst({ where: { id, ...filter } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.contract.update({ where: { id }, data: { status: 'CANCELLED' } })
    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}