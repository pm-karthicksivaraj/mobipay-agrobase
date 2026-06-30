import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

/**
 * GET /api/admin/users
 *   List all users across all tenants. SUPER_ADMIN only.
 *
 * Query params: role, tenantId, isActive, search
 */
export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    if (!ctx.isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const tenantId = searchParams.get('tenantId')
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (role) where.role = role
    if (tenantId) where.tenantId = tenantId
    if (isActive === 'true') where.isActive = true
    if (isActive === 'false') where.isActive = false
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          role: true, isActive: true, lastLogin: true, createdAt: true,
          tenant: { select: { id: true, name: true, country: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ])

    // Stats
    const [totalUsers, activeUsers, usersByRole] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { isActive: true } }),
      db.user.groupBy({
        by: ['role'],
        _count: { role: true },
        orderBy: { _count: { role: 'desc' } },
      }),
    ])

    return NextResponse.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalUsers,
        activeUsers,
        usersByRole: usersByRole.map(r => ({ role: r.role, count: r._count.role })),
      },
    })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
  }
}
