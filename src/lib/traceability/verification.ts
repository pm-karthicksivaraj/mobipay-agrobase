import { createHash } from 'crypto'
import type {
  TraceEvent,
  ChainVerificationResult,
  ProofOfOrigin,
  SupplyChainStage,
  TraceEventType,
} from './types'
import { batchStore } from './engine'

// ─── SHA-256 Hashing ──────────────────────────────────────────────────

/**
 * Compute a deterministic SHA-256 hash for a trace event.
 * Excludes the verificationHash field itself (to avoid circularity)
 * and includes the previousEventHash for chain linking.
 */
export function hashEvent(event: TraceEvent): string {
  const hashPayload = {
    id: event.id,
    batchId: event.batchId,
    eventType: event.eventType,
    stage: event.stage,
    timestamp: event.timestamp.toISOString(),
    location: event.location,
    actorId: event.actorId,
    actorName: event.actorName,
    actorType: event.actorType,
    details: event.details,
    previousEventHash: event.previousEventHash,
  }

  const serialized = JSON.stringify(hashPayload, Object.keys(hashPayload).sort())
  return createHash('sha256').update(serialized).digest('hex')
}

// ─── Merkle Tree ───────────────────────────────────────────────────────

/**
 * Compute the Merkle root of a list of hashes.
 * If only one hash, return it directly.
 * If odd number, duplicate the last element.
 */
function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return ''
  if (hashes.length === 1) return hashes[0]

  // Ensure even count by duplicating last
  const level = [...hashes]
  if (level.length % 2 !== 0) {
    level.push(level[level.length - 1])
  }

  const nextLevel: string[] = []
  for (let i = 0; i < level.length; i += 2) {
    const combined = level[i] + level[i + 1]
    nextLevel.push(createHash('sha256').update(combined).digest('hex'))
  }

  return computeMerkleRoot(nextLevel)
}

// ─── Verification System ───────────────────────────────────────────────

/**
 * Verify the integrity of an event chain for a batch.
 * Checks:
 * 1. Each event's hash matches its data (no tampering)
 * 2. Each event references the previous event's hash (chain integrity)
 * 3. Detects any gaps or broken links
 */
export function verifyEventChain(
  batchId: string
): ChainVerificationResult {
  const batch = batchStore.get(batchId)

  if (!batch) {
    return {
      isValid: false,
      totalEvents: 0,
      verifiedEvents: 0,
      tamperedEvents: [],
      missingLinks: [],
      merkleRoot: '',
      verifiedAt: new Date(),
    }
  }

  const events = batch.traceEvents
  const tamperedEvents: string[] = []
  const missingLinks: number[] = []
  let verifiedCount = 0

  if (events.length === 0) {
    return {
      isValid: true,
      totalEvents: 0,
      verifiedEvents: 0,
      tamperedEvents: [],
      missingLinks: [],
      merkleRoot: '',
      verifiedAt: new Date(),
    }
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i]

    // 1. Verify event hash matches data
    const expectedHash = hashEvent(event)
    if (event.verificationHash !== expectedHash) {
      tamperedEvents.push(
        `Event[${i}] ${event.id}: expected ${expectedHash}, got ${event.verificationHash}`
      )
    } else {
      verifiedCount++
    }

    // 2. Verify chain link
    if (i === 0) {
      // First event should have no previous hash (or null)
      if (event.previousEventHash !== undefined && event.previousEventHash !== null) {
        missingLinks.push(i)
      }
    } else {
      const prevEvent = events[i - 1]
      if (
        !event.previousEventHash ||
        event.previousEventHash !== prevEvent.verificationHash
      ) {
        missingLinks.push(i)
      }
    }
  }

  // Compute Merkle root from all event hashes
  const eventHashes = events.map((e) => e.verificationHash ?? '')
  const merkleRoot = computeMerkleRoot(eventHashes)

  return {
    isValid: tamperedEvents.length === 0 && missingLinks.length === 0,
    totalEvents: events.length,
    verifiedEvents: verifiedCount,
    tamperedEvents,
    missingLinks,
    merkleRoot,
    verifiedAt: new Date(),
  }
}

/**
 * Create a verification anchor (Merkle root) for all events in a batch.
 * This anchor can be stored externally (e.g., on a blockchain) and used
 * later to verify the batch hasn't been tampered with.
 */
export function createVerificationAnchor(
  batchId: string,
  events?: TraceEvent[]
): string {
  let eventList: TraceEvent[]

  if (events) {
    eventList = events
  } else {
    const batch = batchStore.get(batchId)
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`)
    }
    eventList = batch.traceEvents
  }

  const hashes = eventList.map((e) => e.verificationHash ?? '')
  return computeMerkleRoot(hashes)
}

/**
 * Verify a batch against a previously stored anchor hash.
 * Returns true if the Merkle root matches (no tampering occurred).
 */
export function verifyAnchor(
  batchId: string,
  anchorHash: string
): boolean {
  const currentRoot = createVerificationAnchor(batchId)
  return currentRoot === anchorHash
}

/**
 * Generate a complete Proof of Origin document for a batch.
 * This provides end-to-end traceability proof from seed to current state,
 * including all events, actors, locations, timestamps, hash chain verification,
 * certification status, and EUDR compliance status.
 */
export function generateProofOfOrigin(batchId: string): ProofOfOrigin {
  const batch = batchStore.get(batchId)
  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`)
  }

  // Build the journey from trace events
  const journey: ProofOfOrigin['journey'] = batch.traceEvents.map((event) => ({
    stage: event.stage as SupplyChainStage,
    eventType: event.eventType as TraceEventType,
    timestamp: event.timestamp,
    location: {
      name: event.location.name ?? 'Unknown',
      lat: event.location.lat,
      lng: event.location.lng,
    },
    actor: event.actorName,
    hash: event.verificationHash ?? '',
  }))

  // Compute the overall chain hash (hash of all event hashes concatenated)
  const chainHash = createVerificationAnchor(batchId)

  // Determine EUDR compliance
  const eudrCompliant = batch.certifications.includes('EUDR')

  return {
    batchId,
    commodity: batch.commodity,
    farmerName: batch.farmerName,
    farmName: batch.farmName,
    farmLocation: {
      lat: 0, // Would come from FarmLand in production
      lng: 0,
      name: batch.farmName,
    },
    sowingDate: batch.sowingDate,
    journey,
    chainHash,
    certifications: batch.certifications,
    eudrCompliant,
    verifiedAt: new Date(),
  }
}