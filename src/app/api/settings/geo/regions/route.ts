import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const regions = await db.region.findMany({
    include: {
      subRegions: { include: {
        districts: { include: {
          constituencies: { include: {
            subCounties: { include: {
              parishes: { include: { villages: true } }
            } }
          } }
        } }
      } }
    },
    orderBy: { name: 'asc' }
  })
  return NextResponse.json({ data: regions })
}

export async function POST(req: globalThis.Request) {
  const body = await req.json()
  if (body.subRegionId) {
    const district = await db.district.create({ data: { name: body.name, subRegionId: body.subRegionId } })
    return NextResponse.json({ data: district }, { status: 201 })
  }
  if (body.regionId) {
    const sr = await db.subRegion.create({ data: { name: body.name, regionId: body.regionId } })
    return NextResponse.json({ data: sr }, { status: 201 })
  }
  const region = await db.region.create({ data: { name: body.name, country: body.country || 'Uganda' } })
  return NextResponse.json({ data: region }, { status: 201 })
}