import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

/**
 * GET /api/trainings/[id]/attendance
 *   List all enrollment/attendance records for a training.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any

  const training = await db.training.findFirst({ where: { id, ...tf } })
  if (!training) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const attendance = await db.trainingAttendance.findMany({
    where: { trainingId: id },
    include: {
      farmer: { select: { id: true, firstName: true, lastName: true, farmerCode: true, phone: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ data: attendance })
}

/**
 * POST /api/trainings/[id]/attendance
 *   Enroll a farmer in a training.
 *   Body: { farmerId, enrollmentStatus? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const body = await req.json()

  const training = await db.training.findFirst({ where: { id, ...tf } })
  if (!training) return NextResponse.json({ error: 'Training not found' }, { status: 404 })

  if (!body.farmerId) return NextResponse.json({ error: 'farmerId is required' }, { status: 400 })

  // Check if already enrolled
  const existing = await db.trainingAttendance.findFirst({
    where: { trainingId: id, farmerId: body.farmerId },
  })
  if (existing) return NextResponse.json({ error: 'Farmer already enrolled' }, { status: 409 })

  const attendance = await db.trainingAttendance.create({
    data: {
      trainingId: id,
      farmerId: body.farmerId,
      enrolledAt: new Date(),
      enrollmentStatus: body.enrollmentStatus || 'ENROLLED',
      enrolledById: ctx.userId,
    },
    include: { farmer: { select: { firstName: true, lastName: true, farmerCode: true } } },
  })

  return NextResponse.json({ data: attendance }, { status: 201 })
}
