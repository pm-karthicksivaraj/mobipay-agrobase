import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// TODO: Add tenantId to this model for full multi-tenant isolation
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const [data, total] = await Promise.all([
      db.survey.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { questions: true, responses: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.survey.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, questions } = body

    const survey = await db.$transaction(async (tx) => {
      const created = await tx.survey.create({
        data: {
          title,
          description: description || null,
          status: 'ACTIVE',
          questions: {
            create: (questions || []).map(
              (q: { question: string; type: string; options?: unknown; sortOrder?: number }, i: number) => ({
                question: q.question,
                type: q.type,
                options: q.options ? JSON.stringify(q.options) : null,
                sortOrder: q.sortOrder ?? i,
              })
            ),
          },
        },
        include: { questions: true },
      })
      return created
    })

    return NextResponse.json(survey, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create survey' }, { status: 500 })
  }
}