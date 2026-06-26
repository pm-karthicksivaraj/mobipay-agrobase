import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import { hashPassword } from '@/lib/password'
import { hasPermission } from '@/lib/permissions'
import { z } from 'zod/v4'

const createUserSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(1, 'Phone is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().nullable(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  avatarUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
})

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'users:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {
      ...buildTenantFilter(ctx, 'tenantId'),
    }
    if (role) where.role = role
    if (status === 'active') where.isActive = true
    if (status === 'inactive') where.isActive = false
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const [data, total] = await Promise.all([
      db.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { tenant: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ])

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()

    if (!hasPermission(ctx.role, 'users:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data
    const passwordHash = data.password ? await hashPassword(data.password) : null

    const user = await db.user.create({
      data: {
        tenantId: ctx.tenantId,
        role: data.role,
        email: data.email,
        phone: data.phone,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        avatarUrl: data.avatarUrl,
        isActive: data.isActive ?? true,
      },
      include: { tenant: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}