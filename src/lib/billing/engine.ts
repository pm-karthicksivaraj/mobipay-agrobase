/**
 * Agrobase V3 — Billing Engine
 * MobiPay AgroSys Limited
 *
 * BillingEngine class with static methods for subscription management,
 * invoice generation, usage calculation, and payment application.
 */

import { db } from '@/lib/db'
import type { PlanType, BillingCycle, InvoiceItem, InvoiceStatus } from './types'
import { PLANS, getPlan } from './plans'
import { roundMoney } from '../payments/types'

// ---------------------------------------------------------------------------
// Invoice Number Generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique invoice number.
 * Format: INV-{code}-{YYYYMMDD}-{seq}
 */
async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
  const code = (tenant?.name ?? 'UNKNOWN')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)

  const today = new Date()
  const dateStr =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0')

  const prefix = `INV-${code}-${dateStr}-`

  // Count existing invoices with this prefix today
  const existingCount = await db.invoice.count({
    where: { invoiceNumber: { startsWith: prefix } },
  })

  const seq = existingCount + 1
  return `${prefix}${String(seq).padStart(4, '0')}`
}

// ---------------------------------------------------------------------------
// Helper: get tenant currency
// ---------------------------------------------------------------------------

function getTenantCurrency(country: string | null | undefined): string {
  const map: Record<string, string> = { UG: 'UGX', GH: 'GHS', KE: 'KES' }
  return map[country ?? 'UG'] ?? 'UGX'
}

// ---------------------------------------------------------------------------
// BillingEngine Class
// ---------------------------------------------------------------------------

export class BillingEngine {
  /**
   * Create or update a subscription for a tenant.
   * Upserts Subscription, enables ModuleEntitlements, generates first Invoice.
   */
  static async createSubscription(
    tenantId: string,
    plan: string,
    cycle: BillingCycle,
  ): Promise<{ subscriptionId: string; invoiceId: string }> {
    const planConfig = getPlan(plan)
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { country: true },
    })

    const months = cycle === 'MONTHLY' ? 1 : cycle === 'QUARTERLY' ? 3 : 12
    const pricePerMonth = cycle === 'ANNUAL' ? planConfig.priceAnnual : planConfig.priceMonthly
    const amount = pricePerMonth * months

    const startDate = new Date()
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + months)

    // Upsert subscription
    const subscription = await db.subscription.upsert({
      where: { id: `${tenantId}-active` },
      create: {
        id: `${tenantId}-active`,
        tenantId,
        plan: planConfig.type,
        amount,
        billingCycle: cycle,
        status: 'ACTIVE',
        startDate,
        endDate,
      },
      update: {
        plan: planConfig.type,
        amount,
        billingCycle: cycle,
        status: 'ACTIVE',
        startDate,
        endDate,
      },
    })

    // Enable ModuleEntitlements for the plan
    await BillingEngine.syncModuleEntitlements(tenantId, planConfig.includedModules)

    console.log(
      `[BillingEngine] Subscription ${plan}/${cycle} for tenant ${tenantId}: USD ${amount}`,
    )

    // Generate first invoice
    const invoice = await BillingEngine.generateInvoice(tenantId)

    return {
      subscriptionId: subscription.id,
      invoiceId: invoice.id,
    }
  }

  /**
   * Generate an invoice for the current billing period.
   * Number format: INV-{code}-{YYYYMMDD}-{seq}
   */
  static async generateInvoice(tenantId: string) {
    const subscription = await db.subscription.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) {
      throw new Error(`No active subscription found for tenant ${tenantId}`)
    }

    const planConfig = getPlan(subscription.plan)
    const months = subscription.billingCycle === 'MONTHLY' ? 1 : subscription.billingCycle === 'QUARTERLY' ? 3 : 12

    const items: InvoiceItem[] = [
      {
        description: `${planConfig.name} Plan — ${subscription.billingCycle} (${months} months)`,
        amount: roundMoney(subscription.amount / months),
        quantity: months,
        total: subscription.amount,
      },
    ]

    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    const invoiceNumber = await generateInvoiceNumber(tenantId)

    const invoice = await db.invoice.create({
      data: {
        tenantId,
        invoiceNumber,
        subscriptionId: subscription.id,
        plan: planConfig.type,
        billingCycle: subscription.billingCycle,
        items: JSON.stringify(items),
        subtotal,
        tax: 0,
        taxRate: 0,
        total: subtotal,
        currency: getTenantCurrency(
          (await db.tenant.findUnique({ where: { id: tenantId }, select: { country: true } }))?.country,
        ),
        status: 'PENDING',
        dueDate,
      },
    })

    console.log(`[BillingEngine] Generated invoice ${invoiceNumber} for ${tenantId}: ${subtotal}`)
    return invoice
  }

  /**
   * Check the current subscription status for a tenant.
   */
  static async checkSubscriptionStatus(tenantId: string): Promise<{
    status: string
    plan: string
    currentEnd: Date | null
    daysRemaining: number
    isNearExpiry: boolean
    isExpired: boolean
  }> {
    const subscription = await db.subscription.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) {
      return {
        status: 'NONE',
        plan: 'FREE',
        currentEnd: null,
        daysRemaining: 0,
        isNearExpiry: false,
        isExpired: true,
      }
    }

    const now = new Date()
    const end = subscription.endDate ?? new Date(now.getTime() + 30 * 86400000)
    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / 86400000)

    return {
      status: subscription.status,
      plan: subscription.plan,
      currentEnd: end,
      daysRemaining: Math.max(0, daysRemaining),
      isNearExpiry: daysRemaining <= 7 && daysRemaining > 0,
      isExpired: daysRemaining <= 0,
    }
  }

  /**
   * Calculate current usage for a tenant (farmers, users vs plan limits).
   */
  static async calculateUsage(tenantId: string): Promise<{
    farmerCount: number
    userCount: number
    planMaxFarmers: number
    planMaxUsers: number
  }> {
    const [farmerCount, userCount] = await Promise.all([
      db.farmerProfile.count({ where: { tenantId } }),
      db.user.count({ where: { tenantId } }),
    ])

    const subscription = await db.subscription.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })

    const planName = subscription?.plan ?? 'FREE'
    const plan = getPlan(planName)

    return {
      farmerCount,
      userCount,
      planMaxFarmers: plan.maxFarmers,
      planMaxUsers: plan.maxUsers,
    }
  }

  /**
   * Record a payment against an invoice and update its status.
   */
  static async applyPayment(invoiceId: string, amount: number): Promise<InvoiceStatus> {
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } })

    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`)
    }

    const newPaidAmount = (invoice.paidAmount ?? 0) + amount

    let status: InvoiceStatus
    if (newPaidAmount >= invoice.total) {
      status = 'PAID'
    } else if (newPaidAmount > 0) {
      status = 'PARTIALLY_PAID'
    } else {
      status = invoice.status as InvoiceStatus
    }

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        status,
        paidAt: status === 'PAID' ? new Date() : invoice.paidAt,
      },
    })

    console.log(`[BillingEngine] Applied payment of ${amount} to invoice ${invoiceId}: status → ${status}`)
    return status
  }

  /**
   * Get a complete billing summary for a tenant: subscription + invoice + usage.
   */
  static async getBillingSummary(tenantId: string) {
    const [subscription, invoices, usage] = await Promise.all([
      db.subscription.findFirst({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      }),
      db.invoice.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      BillingEngine.calculateUsage(tenantId),
    ])

    const planName = subscription?.plan ?? 'FREE'
    const plan = getPlan(planName)

    return {
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            amount: subscription.amount,
            billingCycle: subscription.billingCycle,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
          }
        : null,
      plan: planName,
      planConfig: plan,
      usage,
      recentInvoices: invoices,
    }
  }

  /**
   * Return plan configuration details.
   */
  static getPlanDetails(planName: string) {
    return getPlan(planName)
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Synchronise module entitlements to match the plan's included modules.
   */
  private static async syncModuleEntitlements(
    tenantId: string,
    moduleCodes: string[],
  ): Promise<void> {
    const existing = await db.moduleEntitlement.findMany({
      where: { tenantId },
      select: { id: true, moduleCode: true },
    })

    const existingMap = new Map(existing.map((e) => [e.moduleCode, e.id]))

    // Enable modules in the plan
    for (const code of moduleCodes) {
      if (existingMap.has(code)) {
        await db.moduleEntitlement.update({
          where: { id: existingMap.get(code)! },
          data: { isEnabled: true },
        })
        existingMap.delete(code)
      } else {
        await db.moduleEntitlement.create({
          data: { tenantId, moduleCode: code, isEnabled: true },
        })
      }
    }

    // Disable modules NOT in the plan
    for (const [, id] of existingMap) {
      await db.moduleEntitlement.update({
        where: { id },
        data: { isEnabled: false },
      })
    }
  }
}