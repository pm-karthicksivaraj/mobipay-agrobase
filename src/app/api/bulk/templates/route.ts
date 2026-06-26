import { NextRequest, NextResponse } from 'next/server'
import { BulkEngine } from '@/lib/bulk/engine'

/**
 * GET /api/bulk/templates?type=IMPORT_FARMERS&format=csv|xlsx
 *
 * Download a template file for bulk import.
 * Supports CSV (default) and XLSX formats.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const type = url.searchParams.get('type')
    const format = (url.searchParams.get('format') || 'csv').toLowerCase()

    if (!type || !['IMPORT_FARMERS', 'IMPORT_PURCHASES'].includes(type)) {
      return NextResponse.json({
        error: 'type query param required: IMPORT_FARMERS or IMPORT_PURCHASES',
        availableTypes: [
          { type: 'IMPORT_FARMERS', description: 'Import farmer profiles from CSV/Excel' },
          { type: 'IMPORT_PURCHASES', description: 'Import purchase records from CSV/Excel' },
        ],
      }, { status: 400 })
    }

    if (!['csv', 'xlsx'].includes(format)) {
      return NextResponse.json({ error: 'format must be csv or xlsx' }, { status: 400 })
    }

    if (format === 'xlsx') {
      // Generate Excel template
      const buffer = BulkEngine.generateExcelTemplate(type)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${type.toLowerCase()}_template.xlsx"`,
        },
      })
    }

    // CSV template (default)
    const template = BulkEngine.getTemplate(type)
    const csvContent = [
      template.headers.join(','),
      template.headers.map((h) => {
        const val = template.example[h] || ''
        return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val
      }).join(','),
    ].join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${type.toLowerCase()}_template.csv"`,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}