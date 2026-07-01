import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'

/**
 * POST /api/farmers/import
 *   Bulk import farmers from CSV data.
 *
 * Request body:
 *   { farmers: [{ firstName, lastName, phone, gender?, email?, ... }] }
 *
 * Returns:
 *   { success: number, failed: number, errors: [{ row, error }] }
 */
export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext()
    const body = await request.json()
    const { farmers } = body as { farmers: Record<string, any>[] }

    if (!Array.isArray(farmers) || farmers.length === 0) {
      return NextResponse.json({ error: 'No farmers data provided' }, { status: 400 })
    }

    const tf = buildTenantFilter(ctx, 'tenantId')
    let success = 0
    let failed = 0
    const errors: Array<{ row: number; error: string }> = []

    // Get current farmer count for auto-code generation
    const existingCount = await db.farmerProfile.count({ where: { ...tf } })

    for (let i = 0; i < farmers.length; i++) {
      const row = farmers[i]
      const rowNum = i + 2 // +2 because row 1 is the CSV header

      try {
        // Validate required fields
        const firstName = (row.firstName || row.first_name || row.FirstName || '').trim()
        const lastName = (row.lastName || row.last_name || row.LastName || '').trim()
        const phone = (row.phone || row.Phone || row.phoneNumber || row.phone_number || '').trim()

        if (!firstName) {
          errors.push({ row: rowNum, error: 'First name is required' })
          failed++
          continue
        }
        if (!lastName) {
          errors.push({ row: rowNum, error: 'Last name is required' })
          failed++
          continue
        }
        if (!phone) {
          errors.push({ row: rowNum, error: 'Phone is required' })
          failed++
          continue
        }

        // Check for duplicate phone within tenant
        const existing = await db.farmerProfile.findFirst({
          where: { phone, ...tf },
          select: { id: true },
        })
        if (existing) {
          errors.push({ row: rowNum, error: `Farmer with phone ${phone} already exists` })
          failed++
          continue
        }

        // Generate farmer code
        const farmerCode = row.farmerCode || row.farmer_code || row.FarmerCode || `FRM-${String(existingCount + success + 1).padStart(5, '0')}`

        // Parse optional fields safely
        const gender = (row.gender || row.Gender || '').trim() || null
        const email = (row.email || row.Email || '').trim() || null
        const education = (row.education || row.Education || '').trim() || null
        const maritalStatus = (row.maritalStatus || row.marital_status || '').trim() || null
        const memberType = (row.memberType || row.member_type || 'General').trim()
        const mainCrops = (row.mainCrops || row.main_crops || '').trim() || null
        const villageName = (row.villageName || row.village_name || row.village || '').trim() || null
        const district = (row.district || row.District || '').trim() || null
        const country = (row.country || row.Country || ctx.tenantId ? 'Uganda' : 'Uganda').trim()
        const nationalIdNo = (row.nationalIdNo || row.national_id || row.nationalIdNumber || '').trim() || null
        const nationalIdType = (row.nationalIdType || row.national_id_type || 'National ID').trim()

        const farmSize = parseFloat(row.farmSize || row.farm_size || '0') || null
        const familyMembers = parseInt(row.familyMembers || row.family_members || '0') || null
        const childrenUnder18 = parseInt(row.childrenUnder18 || row.children_under_18 || '0') || null

        // Create the farmer
        await db.farmerProfile.create({
          data: {
            tenantId: ctx.tenantId,
            firstName,
            lastName,
            phone,
            gender: gender && ['Male', 'Female', 'Other'].includes(gender) ? gender : null,
            email,
            education,
            maritalStatus,
            nationalIdNo,
            nationalIdType,
            memberType: ['General', 'Commercial'].includes(memberType) ? memberType : 'General',
            mainCrops,
            villageName,
            district,
            country,
            farmSize,
            familyMembers,
            childrenUnder18,
            farmerCode,
            status: 'ACTIVE',
          },
        })
        success++
      } catch (err: any) {
        errors.push({ row: rowNum, error: err.message || 'Failed to create farmer' })
        failed++
      }
    }

    return NextResponse.json({
      success,
      failed,
      total: farmers.length,
      errors: errors.slice(0, 50), // limit error list to first 50
    })
  } catch (error: any) {
    console.error('Farmer import error:', error)
    return NextResponse.json(
      { error: 'Failed to import farmers', detail: error.message },
      { status: 500 },
    )
  }
}
