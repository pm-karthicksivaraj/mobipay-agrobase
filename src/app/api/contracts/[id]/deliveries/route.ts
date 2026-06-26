import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id: contractId } = await params
    const filter = buildTenantFilter(ctx)
    const contract = await db.contract.findFirst({ where: { id: contractId, ...filter } })
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    const body = await req.json()
    const { contractItemId, quantity } = body
    if (!contractItemId || !quantity) return NextResponse.json({ error: 'contractItemId and quantity required' }, { status: 400 })
    const item = await db.contractItem.findFirst({ where: { id: contractItemId, contractId } })
    if (!item) return NextResponse.json({ error: 'Contract item not found' }, { status: 404 })
    const updated = await db.contractItem.update({
      where: { id: contractItemId },
      data: { delivered: { increment: quantity } },
    })
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}