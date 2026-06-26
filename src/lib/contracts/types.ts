/**
 * Agrobase V3 — Contract Management Types
 */

export interface ContractInput {
  type: string
  buyerId?: string
  buyerName?: string
  sellerId?: string
  sellerName?: string
  commodity: string
  variety?: string
  grade?: string
  quantity: number
  unitPrice: number
  currency?: string
  totalValue: number
  startDate: string
  endDate: string
  deliveryTerms?: string
  paymentTerms?: string
  qualitySpecs?: string
  penalties?: string
  notes?: string
  items?: ContractItemInput[]
}

export interface ContractItemInput {
  commodity: string
  variety?: string
  grade?: string
  quantity: number
  unitPrice: number
}

export interface MilestoneInput {
  name: string
  dueDate: string
  quantity?: number
  amount?: number
  notes?: string
}

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'