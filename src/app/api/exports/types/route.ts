import { NextResponse } from 'next/server'
import { ExportEngine } from '@/lib/export/engine'

/**
 * GET /api/exports/types — List available export types with column options
 */
export async function GET() {
  try {
    const types = ExportEngine.getExportTypes()
    return NextResponse.json({ types })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}