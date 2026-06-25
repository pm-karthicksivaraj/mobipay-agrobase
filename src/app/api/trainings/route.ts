import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // If type=visit, return farm visits instead
    if (type === 'visit') {
      const [data, total] = await Promise.all([
        db.farmVisit.findMany({
          skip: (page - 1) * limit,
          take: limit,
          include: { farmer: true },
          orderBy: { visitDate: 'desc' },
        }),
        db.farmVisit.count(),
      ])
      return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
    }

    const [data, total] = await Promise.all([
      db.training.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { attendance: true } } },
        orderBy: { date: 'desc' },
      }),
      db.training.count(),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trainings' }, { status: 500 })
  }
}