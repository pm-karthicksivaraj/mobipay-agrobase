import { CarbonCreditsEngine } from '@/lib/carbon/credits/engine'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const result = await CarbonCreditsEngine.expireOverdueCredits()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Carbon credits expire cron error:', error)
    return NextResponse.json({ error: 'Failed to expire overdue credits' }, { status: 500 })
  }
}