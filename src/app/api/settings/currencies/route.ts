/**
 * Agrobase V3 — /api/settings/currencies
 *
 * Multi-tenant endpoint for:
 *   GET    /                  — List supported currencies + tenant's current settings
 *   GET    /exchange-rates    — List exchange rates (filtered by tenant)
 *   POST   /exchange-rates    — Create or update an exchange rate
 *   POST   /exchange-rates/sync — Trigger external rate sync (SUPER_ADMIN only)
 *   DELETE /exchange-rates/[id] — Delete an exchange rate
 *   PATCH  /tenant-currency  — Update tenant's default currency
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, buildTenantFilter } from '@/lib/tenant'
import {
  getSupportedCurrencies,
  getTenantCurrency,
  isValidCurrency,
  requireValidCurrency,
} from '@/lib/currency/engine'
import {
  listExchangeRates,
  upsertExchangeRate,
  deleteExchangeRate,
  fetchExternalRates,
  syncExternalRates,
} from '@/lib/currency/exchange-rates'

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/settings/currencies — Supported currencies + tenant settings
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view')

    // ── Exchange rates view ──
    if (view === 'exchange-rates') {
      const fromCurrency = searchParams.get('fromCurrency') || undefined
      const toCurrency = searchParams.get('toCurrency') || undefined
      const includeExpired = searchParams.get('includeExpired') === 'true'
      const baseOnly = ctx.isSuperAdmin ? searchParams.get('baseOnly') === 'true' : true

      const rates = await listExchangeRates({
        tenantId: ctx.isSuperAdmin ? undefined : ctx.tenantId,
        fromCurrency,
        toCurrency,
        includeExpired,
        baseOnly,
      })

      return NextResponse.json({
        success: true,
        data: rates,
      })
    }

    // ── Default: supported currencies + tenant settings ──
    const currencies = getSupportedCurrencies()
    const tenantCurrency = await getTenantCurrency(ctx.tenantId)

    return NextResponse.json({
      success: true,
      data: {
        supportedCurrencies: currencies,
        tenantCurrency,
        tenantCountry: ctx.tenantId
          ? (await import('@/lib/db')).db.tenant.findUnique({
              where: { id: ctx.tenantId },
              select: { country: true, defaultCurrency: true },
            })
          : null,
      },
    })
  } catch (error) {
    console.error('[currencies GET]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch currency data' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/settings/currencies — Create/update exchange rate or sync
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)
    const body = await request.json()

    // ── Sync external rates (SUPER_ADMIN only) ──
    if (body.action === 'sync') {
      if (!ctx.isSuperAdmin) {
        return NextResponse.json(
          { success: false, error: 'Only SUPER_ADMIN can sync external rates' },
          { status: 403 }
        )
      }

      const base = body.baseCurrency || 'USD'
      requireValidCurrency(base)

      const count = await syncExternalRates(base)

      return NextResponse.json({
        success: true,
        message: `Synced ${count} exchange rates from Frankfurter API (base: ${base})`,
        data: { ratesSynced: count, base },
      })
    }

    // ── Fetch external rates (one-time, no persist) ──
    if (body.action === 'fetch') {
      const base = body.baseCurrency || 'USD'
      requireValidCurrency(base)

      const rates = await fetchExternalRates(base)

      return NextResponse.json({
        success: true,
        data: {
          base,
          rates,
          fetchedAt: new Date().toISOString(),
        },
      })
    }

    // ── Create/Update exchange rate ──
    const { fromCurrency, toCurrency, rate, source, isBase } = body

    if (!fromCurrency || !toCurrency || rate == null) {
      return NextResponse.json(
        { success: false, error: 'fromCurrency, toCurrency, and rate are required' },
        { status: 400 }
      )
    }

    if (!isValidCurrency(fromCurrency)) {
      return NextResponse.json(
        { success: false, error: `Unsupported currency: ${fromCurrency}` },
        { status: 400 }
      )
    }
    if (!isValidCurrency(toCurrency)) {
      return NextResponse.json(
        { success: false, error: `Unsupported currency: ${toCurrency}` },
        { status: 400 }
      )
    }
    if (typeof rate !== 'number' || rate <= 0) {
      return NextResponse.json(
        { success: false, error: 'Rate must be a positive number' },
        { status: 400 }
      )
    }

    // Only SUPER_ADMIN can set base rates
    const effectiveIsBase = ctx.isSuperAdmin ? (isBase || false) : false
    // Regular tenants can only set their own rates
    const effectiveTenantId = ctx.isSuperAdmin && effectiveIsBase ? undefined : ctx.tenantId

    const record = await upsertExchangeRate({
      fromCurrency,
      toCurrency,
      rate,
      source: source || 'manual',
      tenantId: effectiveTenantId,
      isBase: effectiveIsBase,
    })

    return NextResponse.json({
      success: true,
      data: record,
    })
  } catch (error) {
    console.error('[currencies POST]', error)
    const message = error instanceof Error ? error.message : 'Failed to upsert exchange rate'
    return NextResponse.json(
      { success: false, error: message },
      { status: error instanceof Error && error.message.includes('Unsupported') ? 400 : 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/settings/currencies — Update tenant's default currency
// ═══════════════════════════════════════════════════════════════════════════════

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)
    const body = await request.json()

    if (!ctx.tenantId || ctx.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Cannot update currency for SUPER_ADMIN' },
        { status: 400 }
      )
    }

    const { defaultCurrency } = body
    if (!defaultCurrency || !isValidCurrency(defaultCurrency)) {
      return NextResponse.json(
        { success: false, error: `Invalid or unsupported currency: ${defaultCurrency || '(empty)'}` },
        { status: 400 }
      )
    }

    const { db } = await import('@/lib/db')
    const updated = await db.tenant.update({
      where: { id: ctx.tenantId },
      data: { defaultCurrency },
      select: { id: true, name: true, country: true, defaultCurrency: true },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('[currencies PATCH]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update tenant currency' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/settings/currencies — Delete an exchange rate
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getTenantContext(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Exchange rate ID is required (query param: id)' },
        { status: 400 }
      )
    }

    // Non-super-admin can only delete their own tenant's rates
    const deleted = await deleteExchangeRate(
      id,
      ctx.isSuperAdmin ? undefined : ctx.tenantId
    )

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Exchange rate not found or already deleted' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Exchange rate deleted',
    })
  } catch (error) {
    console.error('[currencies DELETE]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete exchange rate' },
      { status: 500 }
    )
  }
}