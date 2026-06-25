export type MovementType = 'IN' | 'OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'WRITE_OFF'
export type StockStatus = 'AVAILABLE' | 'RESERVED' | 'QUARANTINE' | 'EXPIRED'

export interface StockLevel {
  stockItemId: string
  commodity: string
  currentQuantity: number
  minLevel: number
  reorderNeeded: boolean
}

export interface StockSummary {
  warehouseId: string
  totalItems: number
  totalValue: number
  lowStockItems: number
}