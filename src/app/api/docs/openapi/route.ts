import { NextResponse } from 'next/server'
import { openApiGenerator } from '@/lib/openapi/generator'

export async function GET() {
  try {
    const spec = openApiGenerator.generate()
    return NextResponse.json(spec)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}