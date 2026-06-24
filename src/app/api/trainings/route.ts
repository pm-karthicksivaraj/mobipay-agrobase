import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const trainings = await db.training.findMany({ include: { _count: { select: { attendance: true } } }, orderBy: { date: 'desc' }, take: 30 })
  return NextResponse.json(trainings)
}