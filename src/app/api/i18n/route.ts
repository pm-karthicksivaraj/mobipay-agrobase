import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { i18nEngine, SUPPORTED_LOCALES, LOCALE_NAMES } from '@/lib/i18n/engine'

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const locale = searchParams.get('locale') || 'en'
    const namespace = searchParams.get('namespace') || undefined
    const translations = await i18nEngine.getTranslations(locale, ctx.tenantId, namespace)
    return NextResponse.json({ locale, translations, supportedLocales: SUPPORTED_LOCALES, localeNames: LOCALE_NAMES })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const { translations } = body
    if (!Array.isArray(translations)) {
      return NextResponse.json({ error: 'translations array required' }, { status: 400 })
    }
    const results = await i18nEngine.bulkSetTranslations(
      translations.map((t: any) => ({ ...t, tenantId: ctx.tenantId })),
    )
    return NextResponse.json({ data: results, count: results.length })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}