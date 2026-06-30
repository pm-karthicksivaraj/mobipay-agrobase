/**
 * Agrobase V3 — Impact Event Hash Chain
 *
 * Tamper-evident ledger for the Impact Passport. Each event's hash is
 * computed from the previous event's hash + the new event data + timestamp,
 * creating a chain that any auditor can verify with a Python script.
 *
 * No blockchain, no gas fees — just SHA-256 in Postgres. This is the
 * pragmatic version of "blockchain-anchored" for smallholder context.
 */

import crypto from 'crypto'
import { db } from '@/lib/db'

export interface ImpactEventInput {
  tenantId: string
  farmerId: string
  eventType: string
  eventData: Record<string, unknown>
  relatedId?: string
  relatedType?: string
  actorId?: string
  actorName?: string
  actorType?: string
  latitude?: number
  longitude?: number
}

export interface ImpactEventRecord {
  id: string
  hash: string
  prevHash: string | null
  eventType: string
  timestamp: Date
}

/**
 * Compute the SHA-256 hash for an impact event.
 * Hash = SHA256(prevHash + canonical(eventData) + timestamp)
 */
export function computeEventHash(
  prevHash: string | null,
  eventData: Record<string, unknown>,
  timestamp: Date,
): string {
  // Canonical JSON: keys sorted, no whitespace — deterministic
  const canonical = JSON.stringify(eventData, Object.keys(eventData).sort())
  const payload = `${prevHash ?? ''}|${canonical}|${timestamp.toISOString()}`
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex')
}

/**
 * Append a new event to a farmer's impact ledger.
 * Fetches the previous hash, computes the new hash, and stores both.
 *
 * @throws if the farmer does not belong to the tenant
 */
export async function appendImpactEvent(input: ImpactEventInput): Promise<ImpactEventRecord> {
  // Fetch the most recent event for this farmer to get prevHash
  const lastEvent = await db.impactEvent.findFirst({
    where: { farmerId: input.farmerId, tenantId: input.tenantId },
    orderBy: { timestamp: 'desc' },
    select: { hash: true },
  })

  const prevHash = lastEvent?.hash ?? null
  const timestamp = new Date()
  const hash = computeEventHash(prevHash, input.eventData, timestamp)

  const event = await db.impactEvent.create({
    data: {
      tenantId: input.tenantId,
      farmerId: input.farmerId,
      eventType: input.eventType,
      eventData: JSON.stringify(input.eventData),
      prevHash,
      hash,
      relatedId: input.relatedId,
      relatedType: input.relatedType,
      actorId: input.actorId,
      actorName: input.actorName,
      actorType: input.actorType,
      latitude: input.latitude,
      longitude: input.longitude,
      timestamp,
    },
    select: { id: true, hash: true, prevHash: true, eventType: true, timestamp: true },
  })

  return event
}

/**
 * Verify the integrity of a farmer's impact event chain.
 * Returns true if every hash in the chain is valid (re-computable from prevHash).
 *
 * Used by:
 *   - /api/passport/[id]/verify (public verification endpoint)
 *   - Nightly audit cron job
 *   - Verra validation auditor
 */
export async function verifyImpactChain(
  farmerId: string,
): Promise<{ valid: boolean; eventsChecked: number; brokenAt?: number; reason?: string }> {
  const events = await db.impactEvent.findMany({
    where: { farmerId },
    orderBy: { timestamp: 'asc' },
    select: { id: true, hash: true, prevHash: true, eventData: true, timestamp: true },
  })

  if (events.length === 0) {
    return { valid: true, eventsChecked: 0 }
  }

  let prevHash: string | null = null
  for (let i = 0; i < events.length; i++) {
    const event = events[i]

    // Check the prevHash links correctly
    if (event.prevHash !== prevHash) {
      return {
        valid: false,
        eventsChecked: i,
        brokenAt: i,
        reason: `Broken chain at event ${i}: prevHash mismatch`,
      }
    }

    // Re-compute the hash and verify
    let eventData: Record<string, unknown>
    try {
      eventData = JSON.parse(event.eventData)
    } catch {
      return {
        valid: false,
        eventsChecked: i,
        brokenAt: i,
        reason: `Event ${i}: invalid eventData JSON`,
      }
    }
    const expectedHash = computeEventHash(prevHash, eventData, event.timestamp)
    if (expectedHash !== event.hash) {
      return {
        valid: false,
        eventsChecked: i,
        brokenAt: i,
        reason: `Event ${i}: hash mismatch (expected ${expectedHash.slice(0, 12)}..., got ${event.hash.slice(0, 12)}...)`,
      }
    }

    prevHash = event.hash
  }

  return { valid: true, eventsChecked: events.length }
}

/**
 * Get the full impact ledger for a farmer (for the Impact Passport).
 * Returns events in chronological order with decoded eventData.
 */
export async function getFarmerImpactLedger(farmerId: string, limit = 100) {
  const events = await db.impactEvent.findMany({
    where: { farmerId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: {
      id: true,
      eventType: true,
      eventData: true,
      hash: true,
      prevHash: true,
      actorName: true,
      actorType: true,
      relatedId: true,
      relatedType: true,
      latitude: true,
      longitude: true,
      timestamp: true,
    },
  })

  return events.map(e => ({
    ...e,
    eventData: JSON.parse(e.eventData),
  }))
}
