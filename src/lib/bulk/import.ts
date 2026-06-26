/**
 * Agrobase V3 — Bulk Import Engine
 *
 * CSV and Excel (.xlsx) import for farmers and purchases with Zod validation,
 * deduplication, village/group resolution, and detailed per-row error reporting.
 *
 * Supports: .csv (built-in parser) and .xlsx/.xls (SheetJS/xlsx library)
 */

import { z } from 'zod/v4'
import * as XLSX from 'xlsx'
import { db } from '@/lib/db'
import { farmerSchema, purchaseSchema } from './schemas'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ImportResult {
  total: number
  created: number
  updated: number
  skipped: number
  errors: { row: number; message: string; field?: string }[]
}

export interface ParsedRow {
  [key: string]: string
}

export type SupportedFileFormat = 'csv' | 'xlsx' | 'xls'

/** Detect file format from extension or buffer magic bytes */
export function detectFileFormat(fileName: string, buffer?: ArrayBuffer): SupportedFileFormat {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'xlsx' || ext === 'xls') return ext as SupportedFileFormat
  if (ext === 'csv') return 'csv'

  // Fallback: detect by magic bytes
  if (buffer) {
    const header = new Uint8Array(buffer.slice(0, 8))
    // XLSX: PK zip signature (0x50 0x4B)
    if (header[0] === 0x50 && header[1] === 0x4B) return 'xlsx'
    // XLS: D0 CF 11 E0 (OLE2)
    if (header[0] === 0xD0 && header[1] === 0xCF) return 'xls'
  }

  return 'csv' // default
}

/** Convert an Excel/CSV buffer to normalized row objects */
export function parseFileBuffer(
  buffer: ArrayBuffer,
  format: SupportedFileFormat,
): { headers: string[]; rows: ParsedRow[] } {
  if (format === 'xlsx' || format === 'xls') {
    return parseExcelBuffer(buffer)
  }
  // CSV: decode to string and use CSV parser
  const decoder = new TextDecoder('utf-8')
  const csvText = decoder.decode(buffer)
  return parseCsv(csvText)
}

/** Convert a raw string (CSV text) to normalized row objects */
export function parseCsvString(csvData: string): { headers: string[]; rows: ParsedRow[] } {
  return parseCsv(csvData)
}

// ─── Excel Parsing ──────────────────────────────────────────────────────────

/**
 * Parse an Excel (.xlsx/.xls) buffer into normalized row objects.
 * Uses SheetJS (xlsx) library.
 *
 * - Reads the first sheet
 * - Skips completely empty rows
 * - Normalizes all header and cell values to lowercase strings
 * - Handles numeric cells, date cells, and formula results
 */
function parseExcelBuffer(buffer: ArrayBuffer): { headers: string[]; rows: ParsedRow[] } {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: false,   // return raw values, not Date objects
    cellNF: false,      // don't include number format
    cellText: false,    // don't include formatted text
  })

  // Use the first sheet
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { headers: [], rows: [] }
  }

  const worksheet = workbook.Sheets[sheetName]

  // Convert to array of arrays (raw values)
  const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: true,
  })

  if (rawData.length < 2) {
    return { headers: [], rows: [] }
  }

  // Extract and normalize headers
  const headerRow = rawData[0]
  const headers: string[] = []
  for (const cell of headerRow) {
    const val = cellValueToString(cell)
    headers.push(val.trim().toLowerCase())
  }

  // Build row objects, skip completely empty rows
  const rows: ParsedRow[] = []
  for (let i = 1; i < rawData.length; i++) {
    const dataRow = rawData[i]
    // Skip rows where ALL cells are empty
    const allEmpty = dataRow.every((cell) => {
      const v = cellValueToString(cell).trim()
      return v === ''
    })
    if (allEmpty) continue

    const row: ParsedRow = {}
    for (let j = 0; j < headers.length; j++) {
      const val = j < dataRow.length ? dataRow[j] : ''
      row[headers[j]] = cellValueToString(val).trim()
    }
    rows.push(row)
  }

  return { headers, rows }
}

/**
 * Convert a cell value (which can be number, string, boolean, Date, undefined, etc.)
 * to a normalized string.
 */
function cellValueToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value instanceof Date) return value.toISOString().split('T')[0]
  // XLSX rich text
  if (typeof value === 'object' && 'w' in value) return String((value as { w: string }).w)
  return String(value)
}

// ─── CSV Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of row objects.
 * Handles quoted fields (with embedded commas) and trims whitespace.
 */
function parseCsv(csvData: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = csvData
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) {
    return { headers: [], rows: [] }
  }

  const headers = parseCsvLine(lines[0])
  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    // Skip completely empty rows
    const allEmpty = values.every((v) => v.trim() === '')
    if (allEmpty) continue

    const row: ParsedRow = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j].trim().toLowerCase()] = values[j]?.trim() ?? ''
    }
    rows.push(row)
  }

  return { headers: headers.map((h) => h.trim().toLowerCase()), rows }
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        fields.push(current)
        current = ''
      } else {
        current += char
      }
    }
  }
  fields.push(current)

  return fields
}

// ─── Types inferred from schemas ────────────────────────────────────────────

type FarmerInput = z.infer<typeof farmerSchema>
type PurchaseInput = z.infer<typeof purchaseSchema>

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalize a phone number by stripping spaces, dashes, and parentheses */
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '')
}

/** Title-case a string: "john" → "John" */
function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// ─── Bulk Import Engine ─────────────────────────────────────────────────────

export class BulkImportEngine {
  /**
   * Import farmers from parsed row data (works with both CSV and Excel sources).
   *
   * Expected columns (case-insensitive):
   *   first_name, last_name, phone, gender, member_type, village, district,
   *   farm_size_hectares, main_crops, group_name, education, national_id_no,
   *   bank_name, bank_account_no, date_of_birth
   *
   * Features:
   *   - Deduplication by phone number within the same tenant
   *   - Village resolution by name (sets villageId)
   *   - Group resolution by name (sets groupId)
   *   - Upsert mode: if farmer exists (by phone), update non-empty fields
   *   - Detailed per-row error reporting
   */
  async importFarmers(
    tenantId: string,
    rows: ParsedRow[],
    options?: { skipDuplicates?: boolean; upsert?: boolean },
  ): Promise<ImportResult> {
    const result: ImportResult = { total: 0, created: 0, updated: 0, skipped: 0, errors: [] }
    const skipDuplicates = options?.skipDuplicates ?? true
    const upsert = options?.upsert ?? false

    result.total = rows.length
    if (rows.length === 0) return result

    // Pre-load existing farmers keyed by normalized phone
    const existingFarmers = await db.farmerProfile.findMany({
      where: { tenantId },
      select: { id: true, phone: true },
    })
    const existingByPhone = new Map<string, string>() // normalized phone → farmer id
    for (const f of existingFarmers) {
      existingByPhone.set(normalizePhone(f.phone), f.id)
    }

    // Pre-load villages for name-based lookup
    // Village is under Parish (no direct tenantId), load all and match by name
    const villages = await db.village.findMany({
      select: { id: true, name: true },
      take: 5000,
    })
    const villageByName = new Map<string, string>()
    for (const v of villages) {
      villageByName.set(v.name.toLowerCase(), v.id)
    }

    // Pre-load farmer groups for name-based lookup
    const groups = await db.farmerGroup.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    })
    const groupByName = new Map<string, string>()
    for (const g of groups) {
      groupByName.set(g.name.toLowerCase(), g.id)
    }

    // Track phones in current batch for intra-batch dedup
    const batchPhones = new Map<string, number>()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // +2: row 1 is header, data starts at row 2

      // Validate with Zod
      const parsed = farmerSchema.safeParse(row)
      if (!parsed.success) {
        const firstError = parsed.error.issues[0]
        result.errors.push({
          row: rowNumber,
          message: firstError
            ? `${firstError.path.join('.')}: ${firstError.message}`
            : 'Validation failed',
          field: firstError ? String(firstError.path[0]) : undefined,
        })
        continue
      }

      const data = parsed.data as FarmerInput
      const normalizedPhone = normalizePhone(data.phone)

      // Check intra-batch duplicates
      if (batchPhones.has(normalizedPhone)) {
        result.errors.push({
          row: rowNumber,
          message: `Duplicate phone ${data.phone} already seen at row ${batchPhones.get(normalizedPhone)}`,
          field: 'phone',
        })
        result.skipped++
        continue
      }
      batchPhones.set(normalizedPhone, rowNumber)

      // Check DB duplicates
      const existingFarmerId = existingByPhone.get(normalizedPhone)
      if (existingFarmerId && !upsert) {
        if (skipDuplicates) {
          result.skipped++
          continue
        }
        result.errors.push({
          row: rowNumber,
          message: `Farmer with phone ${data.phone} already exists`,
          field: 'phone',
        })
        result.skipped++
        continue
      }

      // Resolve village by name
      let villageId: string | undefined
      if (data.village) {
        villageId = villageByName.get(data.village.trim().toLowerCase())
      }

      // Resolve group by name
      let groupId: string | undefined
      if (data.group_name) {
        groupId = groupByName.get(data.group_name.trim().toLowerCase())
      }

      // Build create/update data
      const farmerData: Record<string, unknown> = {
        firstName: titleCase(data.first_name),
        lastName: titleCase(data.last_name),
        phone: data.phone,
        gender: titleCase(data.gender || 'Male'),
        memberType: titleCase(data.member_type || 'General'),
        farmSize: data.farm_size_hectares,
        mainCrops: data.main_crops
          ? JSON.stringify(data.main_crops.split(';').map((c) => c.trim()).filter(Boolean))
          : undefined,
        education: data.education ? titleCase(data.education) : undefined,
        nationalIdNo: data.national_id_no || undefined,
        bankName: data.bank_name || undefined,
        bankAccountNo: data.bank_account_no || undefined,
        groupId,
        villageId,
      }

      // Parse optional date_of_birth
      if (data.date_of_birth) {
        const dob = new Date(data.date_of_birth)
        if (!isNaN(dob.getTime())) {
          farmerData.dateOfBirth = dob
        }
      }

      try {
        if (existingFarmerId && upsert) {
          // Update existing farmer — only set non-empty fields
          const updateData: Record<string, unknown> = { updatedAt: new Date() }
          for (const [key, val] of Object.entries(farmerData)) {
            if (key === 'tenantId') continue
            if (val !== undefined && val !== null && val !== '') {
              updateData[key] = val
            }
          }
          await db.farmerProfile.update({
            where: { id: existingFarmerId },
            data: updateData,
          })
          result.updated++
        } else {
          // Create new farmer
          await db.farmerProfile.create({
            data: {
              tenantId,
              ...farmerData,
            } as any,
          })
          result.created++
          existingByPhone.set(normalizedPhone, 'new') // prevent later duplicates
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown database error'
        result.errors.push({ row: rowNumber, message: `Database error: ${msg}` })
      }
    }

    return result
  }

  /**
   * Convenience: import farmers from CSV string (backward-compatible).
   */
  async importFarmersFromCsv(
    tenantId: string,
    csvData: string,
    options?: { skipDuplicates?: boolean; upsert?: boolean },
  ): Promise<ImportResult> {
    const { rows } = parseCsv(csvData)
    return this.importFarmers(tenantId, rows, options)
  }

  /**
   * Import purchases from parsed row data.
   *
   * Expected columns (case-insensitive):
   *   farmer_phone, commodity, variety, quantity, unit_price, total_amount,
   *   group_name, purchase_date, status
   *
   * Features:
   *   - Farmer lookup by phone (normalized)
   *   - Group resolution by name
   *   - Auto-calc total_amount from quantity * unit_price if missing
   */
  async importPurchases(
    tenantId: string,
    rows: ParsedRow[],
  ): Promise<ImportResult> {
    const result: ImportResult = { total: 0, created: 0, updated: 0, skipped: 0, errors: [] }
    result.total = rows.length
    if (rows.length === 0) return result

    // Pre-load farmers for lookup
    const farmers = await db.farmerProfile.findMany({
      where: { tenantId },
      select: { id: true, phone: true, groupId: true },
    })
    const farmerByPhone = new Map<string, { id: string; groupId: string | null }>()
    for (const f of farmers) {
      farmerByPhone.set(normalizePhone(f.phone), { id: f.id, groupId: f.groupId })
    }

    // Pre-load groups
    const groups = await db.farmerGroup.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    })
    const groupByName = new Map<string, string>()
    for (const g of groups) {
      groupByName.set(g.name.toLowerCase(), g.id)
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2

      const parsed = purchaseSchema.safeParse(row)
      if (!parsed.success) {
        const firstError = parsed.error.issues[0]
        result.errors.push({
          row: rowNumber,
          message: firstError
            ? `${firstError.path.join('.')}: ${firstError.message}`
            : 'Validation failed',
          field: firstError ? String(firstError.path[0]) : undefined,
        })
        continue
      }

      const data = parsed.data as PurchaseInput
      const normalizedPhone = normalizePhone(data.farmer_phone)
      const farmer = farmerByPhone.get(normalizedPhone)

      if (!farmer) {
        result.errors.push({
          row: rowNumber,
          message: `Farmer with phone ${data.farmer_phone} not found in this tenant`,
          field: 'farmer_phone',
        })
        result.skipped++
        continue
      }

      // Resolve group override
      let groupId: string | null = farmer.groupId
      if (data.group_name) {
        const resolved = groupByName.get(data.group_name.trim().toLowerCase())
        if (resolved) groupId = resolved
      }

      // Calculate total_amount if not provided
      let totalAmount = data.total_amount
      if (totalAmount === undefined && data.unit_price != null && data.quantity) {
        const qty = parseFloat(data.quantity)
        if (!isNaN(qty)) {
          totalAmount = data.unit_price * qty
        }
      }

      // Parse optional purchase_date
      let createdAt: Date | undefined
      if (data.purchase_date) {
        const d = new Date(data.purchase_date)
        if (!isNaN(d.getTime())) {
          createdAt = d
        }
      }

      try {
        await db.purchase.create({
          data: {
            farmerId: farmer.id,
            groupId,
            commodity: data.commodity,
            variety: data.variety || undefined,
            quantity: data.quantity,
            unitPrice: data.unit_price,
            totalAmount,
            status: data.status ? data.status.toUpperCase() : 'PENDING',
            initiatedBy: undefined, // will be set by caller if needed
            ...(createdAt ? { createdAt } : {}),
          },
        })
        result.created++
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown database error'
        result.errors.push({ row: rowNumber, message: `Database error: ${msg}` })
      }
    }

    return result
  }

  /**
   * Convenience: import purchases from CSV string (backward-compatible).
   */
  async importPurchasesFromCsv(
    tenantId: string,
    csvData: string,
  ): Promise<ImportResult> {
    const { rows } = parseCsv(csvData)
    return this.importPurchases(tenantId, rows)
  }

  /**
   * Generate an error report CSV string from an ImportResult.
   */
  static generateErrorReport(errors: ImportResult['errors']): string {
    if (errors.length === 0) return ''

    const lines = ['row,field,error']
    for (const err of errors) {
      const field = (err.field || '').replace(/"/g, '""')
      const message = err.message.replace(/"/g, '""')
      lines.push(`${err.row},"${field}","${message}"`)
    }
    return lines.join('\n')
  }
}

/** Singleton instance for application-wide use */
export const bulkImportEngine = new BulkImportEngine()