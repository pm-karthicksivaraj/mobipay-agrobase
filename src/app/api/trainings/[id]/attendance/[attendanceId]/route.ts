import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

/**
 * PUT /api/trainings/[id]/attendance/[attendanceId]
 *   Update attendance record (mark present/absent, add feedback).
 *   Body: { attended?, enrollmentStatus?, feedbackRating?, feedbackNotes? }
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; attendanceId: string }> }) {
  const { id, attendanceId } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any
  const body = await req.json()

  const training = await db.training.findFirst({ where: { id, ...tf } })
  if (!training) return NextResponse.json({ error: 'Training not found' }, { status: 404 })

  const existing = await db.trainingAttendance.findFirst({
    where: { id: attendanceId, trainingId: id },
  })
  if (!existing) return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })

  const updated = await db.trainingAttendance.update({
    where: { id: attendanceId },
    data: {
      ...(body.attended !== undefined && { attended: body.attended }),
      ...(body.enrollmentStatus && { enrollmentStatus: body.enrollmentStatus }),
      ...(body.feedbackRating !== undefined && { feedbackRating: body.feedbackRating }),
      ...(body.feedbackNotes !== undefined && { feedbackNotes: body.feedbackNotes }),
    },
  })

  return NextResponse.json({ data: updated })
}

/**
 * DELETE /api/trainings/[id]/attendance/[attendanceId]
 *   Remove a farmer's enrollment from a training.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; attendanceId: string }> }) {
  const { id, attendanceId } = await params
  const ctx = await getTenantContext(req)
  const tf = buildTenantFilter(ctx, 'tenantId') as any

  const training = await db.training.findFirst({ where: { id, ...tf } })
  if (!training) return NextResponse.json({ error: 'Training not found' }, { status: 404 })

  const existing = await db.trainingAttendance.findFirst({
    where: { id: attendanceId, trainingId: id },
  })
  if (!existing) return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })

  await db.trainingAttendance.delete({ where: { id: attendanceId } })
  return NextResponse.json({ message: 'Removed' })
}
