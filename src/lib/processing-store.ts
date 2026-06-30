/**
 * In-memory ProcessingBatch store.
 *
 * NOTE: The Prisma schema does not currently have a dedicated ProcessingBatch
 * model (only `ProductBatch`, which is for traceability of farm-origin batches,
 * and `Consignment`, which is for transport/logistics). Until a real
 * `ProcessingBatch` model is added to the schema, we persist batches in
 * process memory here so the Processing view can do full CRUD end-to-end.
 *
 * The store is seeded with a few demo batches on first access so the view
 * isn't empty on a fresh server boot. All CRUD operations (GET/POST/PUT/DELETE)
 * work against this store.
 */

export interface ProcessingBatch {
  id: string
  inputCommodity: string
  processType: string
  outputProduct: string
  inputQuantity: number
  inputUnit: string
  outputQuantity: number
  outputUnit: string
  qualityGrade: string
  qualityScore: number
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PENDING'
  batchNumber: string
  facility: string
  startDate: string
  endDate?: string
  notes?: string
  createdAt: string
}

// Seed data — mirrors the DEMO_BATCHES array in the Processing view so the
// UI shows familiar data before the user starts creating their own batches.
const SEED_BATCHES: ProcessingBatch[] = [
  { id: 'seed-1', batchNumber: 'PCH-2024-001', inputCommodity: 'Arabica Coffee', processType: 'Washing', outputProduct: 'Washed Arabica Parchment', inputQuantity: 5000, inputUnit: 'kg', outputQuantity: 4200, outputUnit: 'kg', qualityGrade: 'Grade 1', qualityScore: 92, status: 'COMPLETED', facility: 'Mt. Elgon Processing Center', startDate: '2024-04-10T06:00:00Z', endDate: '2024-04-10T18:00:00Z', notes: 'Excellent quality cherries. 84% recovery rate.', createdAt: '2024-04-10T06:00:00Z' },
  { id: 'seed-2', batchNumber: 'PCH-2024-002', inputCommodity: 'Arabica Coffee', processType: 'Drying', outputProduct: 'Dried Arabica Parchment', inputQuantity: 4200, inputUnit: 'kg', outputQuantity: 3500, outputUnit: 'kg', qualityGrade: 'Grade 1', qualityScore: 88, status: 'IN_PROGRESS', facility: 'Mt. Elgon Processing Center', startDate: '2024-04-11T06:00:00Z', notes: 'Drying on raised beds. Estimated completion April 14.', createdAt: '2024-04-11T06:00:00Z' },
  { id: 'seed-3', batchNumber: 'PCH-2024-003', inputCommodity: 'Robusta Coffee', processType: 'Hulling', outputProduct: 'Robusta Green Beans', inputQuantity: 3000, inputUnit: 'kg', outputQuantity: 1800, outputUnit: 'kg', qualityGrade: 'Grade 2', qualityScore: 76, status: 'COMPLETED', facility: 'Kampala Processing Hub', startDate: '2024-04-09T08:00:00Z', endDate: '2024-04-09T16:00:00Z', createdAt: '2024-04-09T08:00:00Z' },
  { id: 'seed-4', batchNumber: 'PCH-2024-004', inputCommodity: 'Arabica Coffee', processType: 'Grading', outputProduct: 'Graded Arabica Green Beans', inputQuantity: 3500, inputUnit: 'kg', outputQuantity: 3200, outputUnit: 'kg', qualityGrade: 'Premium', qualityScore: 96, status: 'COMPLETED', facility: 'Mt. Elgon Processing Center', startDate: '2024-04-12T08:00:00Z', endDate: '2024-04-12T14:00:00Z', notes: 'Premium grade - screen size 17+. Export ready.', createdAt: '2024-04-12T08:00:00Z' },
  { id: 'seed-5', batchNumber: 'PCH-2024-005', inputCommodity: 'Sunflower Seeds', processType: 'Packaging', outputProduct: 'Packaged Sunflower Oil', inputQuantity: 2000, inputUnit: 'kg', outputQuantity: 1800, outputUnit: 'L', qualityGrade: 'Grade 1', qualityScore: 90, status: 'IN_PROGRESS', facility: 'Jinja Processing Facility', startDate: '2024-04-13T07:00:00Z', notes: 'Bottling in progress. 750ml and 1L containers.', createdAt: '2024-04-13T07:00:00Z' },
]

// Module-level in-memory store. Survives across requests within the same
// server process; resets on server restart. Held in a global so it survives
// hot-reloads during development without being wiped on every HMR.
const globalAny = globalThis as unknown as {
  __processingBatches?: ProcessingBatch[]
  __processingBatchesInit?: boolean
}

if (!globalAny.__processingBatches) {
  globalAny.__processingBatches = [...SEED_BATCHES]
  globalAny.__processingBatchesInit = true
}

export const batches: ProcessingBatch[] = globalAny.__processingBatches!

export function ensureInitialized(): void {
  if (!globalAny.__processingBatchesInit) {
    batches.length = 0
    batches.push(...SEED_BATCHES)
    globalAny.__processingBatchesInit = true
  }
}

export function generateId(): string {
  return `proc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function generateBatchNumber(): string {
  const year = new Date().getFullYear()
  const seq = String(batches.length + 1).padStart(3, '0')
  return `PCH-${year}-${seq}`
}
