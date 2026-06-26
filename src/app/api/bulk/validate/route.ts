import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { BulkImportEngine, parseFileBuffer, parseCsvString, detectFileFormat } from '@/lib/bulk/import'
import { farmerSchema, purchaseSchema } from '@/lib/bulk/schemas'
import { z } from 'zod/v4'

/**
 * POST /api/bulk/validate — Validate a CSV/Excel file without importing
 *
 * Accepts multipart/form-data with:
 *   - file: CSV or XLSX file (required)
 *   - type: IMPORT_FARMERS | IMPORT_PURCHASES (required)
 *
 * Returns validation results: row count, valid rows, errors (no DB writes).
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const canImport = hasPermission(ctx.role, 'BULK_IMPORT')
    if (!canImport) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const typeStr = formData.get('type') as string | null

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    if (!typeStr || !['IMPORT_FARMERS', 'IMPORT_PURCHASES'].includes(typeStr)) {
      return NextResponse.json({ error: 'type must be IMPORT_FARMERS or IMPORT_PURCHASES' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    const format = detectFileFormat(file.name, buffer.buffer as ArrayBuffer)
    const { headers, rows } = parseFileBuffer(buffer.buffer as ArrayBuffer, format)

    // Pick the right schema
    const schema = typeStr === 'IMPORT_FARMERS' ? farmerSchema : purchaseSchema

    const validRows = 0
    const errors: { row: number; message: string; field?: string }[] = []
    const warnings: string[] = []
    const uniqueValues = new Map<string, Set<string>>()

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2
      const parsed = schema.safeParse(rows[i])

      if (!parsed.success) {
        const issue = parsed.error.issues[0]
        errors.push({
          row: rowNumber,
          message: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Validation failed',
          field: issue ? String(issue.path[0]) : undefined,
        })
      }
    }

    // Collect unique value stats
    if (typeStr === 'IMPORT_FARMERS') {
      const phones = new Set<string>()
      for (const row of rows) {
        phones.add(row.phone?.replace(/[\s\-\(\)]/g, '') || '')
      }
      uniqueValues.set('phone', phones)

      if (rows.length > phones.size) {
        warnings.push(`${rows.length - phones.size} duplicate phone number(s) detected`)
      }
    } else {
      const phones = new Set<string>()
      for (const row of rows) {
        phones.add(row.farmer_phone?.replace(/[\s\-\(\)]/g, '') || '')
      }
      uniqueValues.set('farmer_phone', phones)
    }

    return NextResponse.json({
      fileName: file.name,
      format: ext.replace('.', ''),
      totalRows: rows.length,
      headers,
      validRows: rows.length - errors.length,
      invalidRows: errors.length,
      errors: errors.slice(0, 100), // cap at 100 for response size
      totalErrors: errors.length,
      warnings,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}