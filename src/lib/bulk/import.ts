/**
 * Agrobase V3 — Bulk Import Engine
 *
 * CSV import for farmers and purchases with Zod validation,
 * deduplication, and detailed per-row error reporting.
 *
 * Uses simple string-splitting CSV parser (no external lib).
 */

import { z } from 'zod/v4'
import { db } from '@/lib/db'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ImportResult {
  total: number
  created: number
  skipped: number
  errors: { row: number; message: string }[]
}

// ─── CSV Parsing ─────────────────────────────────────────────────────────────

interface CsvRow {
  [key: string]: string
}

/**
 * Parse a CSV string into an array of row objects.
 * Handles quoted fields (with embedded commas) and trims whitespace.
 */
function parseCsv(csvData: string): { headers: string[]; rows: CsvRow[] } {
  const lines = csvData
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) {
    return { headers: [], rows: [] }
  }

  const headers = parseCsvLine(lines[0])
  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: CsvRow = {}
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
        // Check for escaped quote (double-quote)
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // skip next quote
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
  fields.push(current) // last field

  return fields
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const farmerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z
    .string()
    .min(7, 'Phone must be at least 7 characters')
    .regex(/^[+]?[\d\s\-()]{7,15}$/, 'Invalid phone number format'),
  gender: z.enum(['Male', 'Female', 'Other', 'male', 'female', 'other']).optional().default('Male'),
  member_type: z.enum(['General', 'Commercial', 'general', 'commercial']).optional().default('General'),
  village: z.string().optional(),
  district: z.string().optional(),
  farm_size_hectares: z.coerce.number().positive().optional(),
  main_crops: z.string().optional(),
  group_name: z.string().optional(),
  education: z.enum(['Primary', 'Secondary', 'UG', 'PG', 'Other', 'primary', 'secondary', 'ug', 'pg', 'other']).optional(),
  national_id_no: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account_no: z.string().optional(),
})

type FarmerInput = z.infer<typeof farmerSchema>

const purchaseSchema = z.object({
  farmer_phone: z.string().min(7, 'Farmer phone must be at least 7 characters'),
  commodity: z.string().min(1, 'Commodity is required'),
  variety: z.string().optional(),
  quantity: z.string().min(1, 'Quantity is required'),
  unit_price: z.coerce.number().positive('Unit price must be positive').optional(),
  total_amount: z.coerce.number().positive('Total amount must be positive').optional(),
  group_name: z.string().optional(),
})

type PurchaseInput = z.infer<typeof purchaseSchema>

// ─── Bulk Import Engine ─────────────────────────────────────────────────────

export class BulkImportEngine {
  /**
   * Import farmers from CSV data.
   *
   * Expected CSV columns (case-insensitive):
   *   first_name, last_name, phone, gender, member_type, village, district,
   *   farm_size_hectares, main_crops, group_name, education, national_id_no,
   *   bank_name, bank_account_no
   *
   * Deduplicates by phone number within the same tenant.
   */
  async importFarmers(
    tenantId: string,
    csvData: string,
    options?: { skipDuplicates?: boolean },
  ): Promise<ImportResult> {
    const result: ImportResult = { total: 0, created: 0, skipped: 0, errors: [] }
    const skipDuplicates = options?.skipDuplicates ?? true

    const { rows } = parseCsv(csvData)
    result.total = rows.length

    if (rows.length === 0) {
      return result
    }

    // Pre-load existing phone numbers for deduplication
    const existingPhones = new Set<string>()
    if (skipDuplicates) {
      const existingFarmers = await db.farmerProfile.findMany({
        where: { tenantId },
        select: { phone: true },
      })
      for (const f of existingFarmers) {
        existingPhones.add(f.phone.replace(/[\s\-\(\)]/g, ''))
      }
    }

    // Track phones in the current batch to catch intra-batch duplicates
    const batchPhones = new Map<string, number>() // normalized phone → row number (1-based)

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // +2 because row 1 is header, rows start at index 1

      // Validate with Zod
      const parsed = farmerSchema.safeParse(row)
      if (!parsed.success) {
        const firstError = parsed.error.issues[0]
        result.errors.push({
          row: rowNumber,
          message: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Validation failed',
        })
        continue
      }

      const data = parsed.data as FarmerInput
      const normalizedPhone = data.phone.replace(/[\s\-\(\)]/g, '')

      // Check for duplicates in DB
      if (skipDuplicates && existingPhones.has(normalizedPhone)) {
        result.skipped++
        continue
      }

      // Check for duplicates within this batch
      if (batchPhones.has(normalizedPhone)) {
        result.errors.push({
          row: rowNumber,
          message: `Duplicate phone number ${data.phone} already seen in this import at row ${batchPhones.get(normalizedPhone)}`,
        })
        result.skipped++
        continue
      }
      batchPhones.set(normalizedPhone, rowNumber)

      // Resolve optional group
      let groupId: string | undefined
      if (data.group_name) {
        const group = await db.farmerGroup.findFirst({
          where: { tenantId, name: { equals: data.group_name, mode: 'insensitive' } },
          select: { id: true },
        })
        groupId = group?.id
      }

      try {
        await db.farmerProfile.create({
          data: {
            tenantId,
            firstName: data.first_name.charAt(0).toUpperCase() + data.first_name.slice(1).toLowerCase(),
            lastName: data.last_name.charAt(0).toUpperCase() + data.last_name.slice(1).toLowerCase(),
            phone: data.phone,
            gender: data.gender?.charAt(0).toUpperCase() + data.gender?.slice(1).toLowerCase() || 'Male',
            memberType: data.member_type?.charAt(0).toUpperCase() + data.member_type?.slice(1).toLowerCase() || 'General',
            farmSize: data.farm_size_hectares,
            mainCrops: data.main_crops ? JSON.stringify(data.main_crops.split(';').map((c) => c.trim())) : undefined,
            education: data.education ? data.education.charAt(0).toUpperCase() + data.education.slice(1).toLowerCase() : undefined,
            nationalIdNo: data.national_id_no || undefined,
            bankName: data.bank_name || undefined,
            bankAccountNo: data.bank_account_no || undefined,
            groupId,
          },
        })
        result.created++
        // Add to existing set to catch later duplicates
        existingPhones.add(normalizedPhone)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown database error'
        result.errors.push({ row: rowNumber, message: `Database error: ${msg}` })
      }
    }

    return result
  }

  /**
   * Import purchases from CSV data.
   *
   * Expected CSV columns (case-insensitive):
   *   farmer_phone, commodity, variety, quantity, unit_price, total_amount, group_name
   *
   * The farmer_phone is used to look up the farmer within the same tenant.
   */
  async importPurchases(
    tenantId: string,
    csvData: string,
  ): Promise<ImportResult> {
    const result: ImportResult = { total: 0, created: 0, skipped: 0, errors: [] }

    const { rows } = parseCsv(csvData)
    result.total = rows.length

    if (rows.length === 0) {
      return result
    }

    // Pre-load farmers for lookup (map by normalized phone)
    const farmers = await db.farmerProfile.findMany({
      where: { tenantId },
      select: { id: true, phone: true, groupId: true },
    })
    const farmerByPhone = new Map<string, { id: string; groupId: string | null }>()
    for (const f of farmers) {
      farmerByPhone.set(f.phone.replace(/[\s\-\(\)]/g, ''), { id: f.id, groupId: f.groupId })
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // +2 because row 1 is header

      // Validate with Zod
      const parsed = purchaseSchema.safeParse(row)
      if (!parsed.success) {
        const firstError = parsed.error.issues[0]
        result.errors.push({
          row: rowNumber,
          message: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Validation failed',
        })
        continue
      }

      const data = parsed.data as PurchaseInput
      const normalizedPhone = data.farmer_phone.replace(/[\s\-\(\)]/g, '')
      const farmer = farmerByPhone.get(normalizedPhone)

      if (!farmer) {
        result.errors.push({
          row: rowNumber,
          message: `Farmer with phone ${data.farmer_phone} not found in this tenant`,
        })
        result.skipped++
        continue
      }

      // Resolve group override if provided
      let groupId: string | null = farmer.groupId
      if (data.group_name) {
        const group = await db.farmerGroup.findFirst({
          where: { tenantId, name: { equals: data.group_name, mode: 'insensitive' } },
          select: { id: true },
        })
        if (group) groupId = group.id
      }

      try {
        await db.purchase.create({
          data: {
            farmerId: farmer.id,
            groupId: groupId,
            commodity: data.commodity,
            variety: data.variety || undefined,
            quantity: data.quantity,
            unitPrice: data.unit_price,
            totalAmount: data.total_amount ?? (data.unit_price != null && data.quantity
              ? data.unit_price * parseFloat(data.quantity)
              : undefined),
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
}

/** Singleton instance for application-wide use */
export const bulkImportEngine = new BulkImportEngine()