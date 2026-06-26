/**
 * Agrobase V3 — Quality Management Types
 */

export interface GradeDefinitionInput {
  commodity: string
  grade: string
  description?: string
  criteria: string // JSON string of criteria
  pricePremium?: number
}

export interface QualityInspectionInput {
  warehouseId?: string
  stockItemId?: string
  gradeDefId?: string
  batchCode?: string
  commodity: string
  sampleWeight: number
  parameters: string // JSON string of inspection parameters
  overallScore?: number
  grade?: string
  passed?: boolean
  inspectorId?: string
  notes?: string
}

export interface QualityResult {
  passed: boolean
  grade: string
  score: number
  details: Record<string, unknown>
}