import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { hasPermission } from '@/lib/permissions'
import { BulkEngine } from '@/lib/bulk/engine'
import { BulkImportEngine, parseFileBuffer, parseCsvString, detectFileFormat } from '@/lib/bulk/import'
import type { BulkOperationType, SupportedFileFormat } from '@/lib/bulk/types'

/**
 * POST /api/bulk/import — Upload CSV/Excel file and trigger async import
 *
 * Accepts multipart/form-data with:
 *   - file: CSV or XLSX file (required)
 *   - type: IMPORT_FARMERS | IMPORT_PURCHASES (required)
 *   - skipDuplicates: "true" | "false" (optional, default true)
 *   - upsert: "true" | "false" (optional, default false)
 *
 * For programmatic (non-file) import, send JSON body with:
 *   - csvData: string (raw CSV content)
 *   - type: string
 *   - fileName: string
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const canImport = hasPermission(ctx.role, 'BULK_IMPORT')
    if (!canImport) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const contentType = req.headers.get('content-type') || ''
    let fileData: string        // CSV text or base64-encoded binary
    let fileName: string
    let importType: BulkOperationType
    let fileSize = 0
    let totalRows = 0

    const VALID_TYPES = ['IMPORT_FARMERS', 'IMPORT_PURCHASES']
    const VALID_EXTENSIONS = ['.csv', '.xlsx', '.xls']
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB

    if (contentType.includes('multipart/form-data')) {
      // ── File upload path ──────────────────────────────────────────
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const typeStr = formData.get('type') as string | null
      const skipDup = formData.get('skipDuplicates') as string | null
      const upsertStr = formData.get('upsert') as string | null

      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
      if (!typeStr || !VALID_TYPES.includes(typeStr)) {
        return NextResponse.json({ error: 'type must be IMPORT_FARMERS or IMPORT_PURCHASES' }, { status: 400 })
      }

      // Validate file extension
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
      if (!VALID_EXTENSIONS.includes(ext)) {
        return NextResponse.json({
          error: `Unsupported file format: ${ext}. Accepted: ${VALID_EXTENSIONS.join(', ')}`,
        }, { status: 400 })
      }

      // Validate file size
      if (file.size > MAX_SIZE) {
        return NextResponse.json({
          error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max 10MB.`,
        }, { status: 400 })
      }

      if (file.size === 0) {
        return NextResponse.json({ error: 'File is empty' }, { status: 400 })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      fileSize = file.size
      fileName = file.name
      importType = typeStr as BulkOperationType

      if (ext === '.csv') {
        // CSV: store as plain text
        fileData = buffer.toString('utf-8')
        // Count rows for progress
        const lineCount = fileData.split(/\r?\n/).filter((l) => l.trim().length > 0).length
        totalRows = Math.max(0, lineCount - 1)
      } else {
        // Excel (.xlsx/.xls): store as base64
        fileData = buffer.toString('base64')
        // Parse to count rows
        try {
          const format = detectFileFormat(fileName, buffer.buffer as ArrayBuffer)
          const parsed = parseFileBuffer(buffer.buffer as ArrayBuffer, format)
          totalRows = parsed.rows.length
        } catch {
          totalRows = 0
        }
      }

      // Store skipDuplicates and upsert flags in the operation metadata
      // (encoded as prefix in configFile: "flags:skipDup=true,upsert=false|data...")
      const flags = [`skipDup=${skipDup !== 'false'}`, `upsert=${upsertStr === 'true'}`].join(',')
      fileData = `flags:${flags}|${fileData}`
    } else {
      // ── JSON body path (programmatic / API) ─────────────────────
      const body = await req.json()
      const csvData = body.csvData
      fileName = body.fileName || `import_${Date.now()}.csv`
      importType = body.type

      if (!csvData || typeof csvData !== 'string') {
        return NextResponse.json({ error: 'csvData is required' }, { status: 400 })
      }
      if (!importType || !VALID_TYPES.includes(importType)) {
        return NextResponse.json({ error: 'type must be IMPORT_FARMERS or IMPORT_PURCHASES' }, { status: 400 })
      }

      fileSize = Buffer.byteLength(csvData, 'utf-8')
      const lineCount = csvData.split(/\r?\n/).filter((l) => l.trim().length > 0).length
      totalRows = Math.max(0, lineCount - 1)

      const flags = [`skipDup=${body.skipDuplicates !== false}`, `upsert=${body.upsert === true}`].join(',')
      fileData = `flags:${flags}|${csvData}`
    }

    // Create operation record
    const operation = await BulkEngine.createOperation(
      ctx.tenantId,
      importType,
      fileName,
      { fileSize, totalRows, configFile: fileData, performedBy: ctx.userId },
    )

    // Fire-and-forget async processing
    const engine = new BulkEngine()
    engine.executeOperation(operation.id, ctx.tenantId).catch((err) => {
      console.error(`[BulkImport] Operation ${operation.id} failed:`, err instanceof Error ? err.message : err)
    })

    return NextResponse.json({
      operation: {
        id: operation.id,
        type: operation.type,
        status: operation.status,
        fileName: operation.fileName,
        totalRows,
      },
      message: `Import started. ${totalRows} rows to process.`,
    }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    console.error('[BulkImport] POST error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}