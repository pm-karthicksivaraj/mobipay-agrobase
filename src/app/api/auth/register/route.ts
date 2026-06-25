import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, phone, password, role, tenantId, firstName, lastName } = body

    if (!phone || !password || !firstName || !lastName || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Phone, password, firstName, lastName, and tenantId are required' },
        { status: 400 }
      )
    }

    // Check if phone already exists
    const existingUser = await db.user.findUnique({
      where: { phone },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'A user with this phone number already exists' },
        { status: 409 }
      )
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await db.user.findFirst({
        where: { email },
      })
      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: 'A user with this email already exists' },
          { status: 409 }
        )
      }
    }

    const user = await db.user.create({
      data: {
        tenantId,
        role: role || 'FARMER',
        email: email || null,
        phone,
        passwordHash: password, // Dev: store plain text
        firstName,
        lastName,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json(
      { success: false, error: message.slice(0, 500) },
      { status: 500 }
    )
  }
}