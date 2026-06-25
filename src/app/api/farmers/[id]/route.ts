import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const farmer = await db.farmerProfile.findUnique({
    where: { id },
    include: {
      group: true, village: { include: { parish: { include: { subCounty: { include: { constituency: { include: { district: { include: { subRegion: { include: { region: true } } } } } } } } } } } },
      creditScores: { orderBy: { scoreDate: 'desc' }, take: 1 },
      savings: { take: 10, orderBy: { createdAt: 'desc' } },
      vslaLoans: { take: 10, orderBy: { createdAt: 'desc' } },
      farms: { include: { cultivations: true } },
      trainings: { include: { training: true } }
    }
  })
  if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 })
  return NextResponse.json({ data: farmer })
}