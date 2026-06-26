import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Verify survey belongs to this tenant
    const survey = await db.survey.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })
    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    const where = { surveyId: id }

    const [data, total] = await Promise.all([
      db.surveyResponse.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.surveyResponse.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getTenantContext()
    const body = await request.json()
    const { respondentId, answers } = body

    // Verify survey belongs to this tenant
    const survey = await db.survey.findFirst({
      where: { id, tenantId: ctx.tenantId },
    })
    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    const response = await db.surveyResponse.create({
      data: {
        surveyId: id,
        respondentId: respondentId || null,
        answers: typeof answers === 'string' ? answers : JSON.stringify(answers),
      },
    })

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 })
  }
}