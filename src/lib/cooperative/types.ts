/**
 * Agrobase V3 — Cooperative ERP Types
 * MobiPay AgroSys Limited
 *
 * Type definitions for the cooperative accounting, produce intake,
 * and farmer payment modules.
 */

// ---------------------------------------------------------------------------
// Chart of Accounts
// ---------------------------------------------------------------------------

/** Standard account classification */
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'

/** Debit or credit entry side */
export type EntryType = 'DEBIT' | 'CREDIT'

/** A single ledger account in the chart of accounts */
export interface ChartAccount {
  code: string
  name: string
  type: AccountType
  description: string
  normalBalance: EntryType
  parentCode?: string
  isActive: boolean
}

// ---------------------------------------------------------------------------
// Journal Entries
// ---------------------------------------------------------------------------

/** A single line in a journal entry (debit or credit side) */
export interface JournalEntryLine {
  accountId: string
  accountCode: string
  accountName: string
  accountType: AccountType
  entryType: EntryType
  amount: number
  description?: string
}

/** A complete journal entry with balanced debit and credit lines */
export interface JournalEntry {
  id: string
  tenantId: string
  date: Date
  description: string
  reference: string
  entries: JournalEntryLine[]
  createdBy: string
  status: 'DRAFT' | 'POSTED' | 'REVERSED'
  createdAt?: Date
  postedAt?: Date
}

// ---------------------------------------------------------------------------
// Produce Intake
// ---------------------------------------------------------------------------

/** Intake workflow status */
export type IntakeStatus =
  | 'DRAFT'
  | 'WEIGHED'
  | 'GRADED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'STORED'

/** Complete produce intake record */
export interface ProduceIntakeRecord {
  id: string
  tenantId: string
  cooperativeId: string
  farmerId: string
  commodity: string
  variety?: string
  quantityKg: number
  moistureContent?: number
  grade?: string
  pricePerKg: number
  totalAmount: number
  intakeDate: Date
  status: IntakeStatus
  receivedBy: string
  warehouse?: string
  qualityNotes?: string
  createdAt?: Date
  updatedAt?: Date
}

/** Summary statistics for produce intake */
export interface IntakeSummary {
  cooperativeId: string
  period: string
  totalIntakes: number
  totalQuantityKg: number
  totalValue: number
  averagePricePerKg: number
  byCommodity: Record<string, { quantityKg: number; value: number }>
  byGrade: Record<string, { quantityKg: number; value: number }>
}

// ---------------------------------------------------------------------------
// Farmer Payments
// ---------------------------------------------------------------------------

/** Payment phase for two-phase farmer payments */
export type PaymentPhase = 'FIRST' | 'FINAL'

/** A deduction applied to a farmer payment */
export interface PaymentDeduction {
  type: string     // VSLA_SAVINGS, LOAN_REPAYMENT, TRANSPORT, PROCESSING, INSURANCE
  amount: number
  description: string
}

/** Complete farmer payment record */
export interface FarmerPaymentRecord {
  id: string
  tenantId: string
  cooperativeId: string
  farmerId: string
  intakeId: string
  phase: PaymentPhase
  amount: number
  paymentMethod: string
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED'
  paidAt?: Date
  transactionRef?: string
  deductions: PaymentDeduction[]
  netAmount: number
  createdAt?: Date
  updatedAt?: Date
}

// ---------------------------------------------------------------------------
// Financial Summaries
// ---------------------------------------------------------------------------

/** Cooperative-level financial summary */
export interface CoopFinancialSummary {
  totalIntakeValue: number
  totalFirstPayments: number
  totalFinalPayments: number
  outstandingPayments: number
  totalDeductions: number
  farmerEquity: number
  period: string
}

// ---------------------------------------------------------------------------
// Trial Balance
// ---------------------------------------------------------------------------

/** A single account in the trial balance */
export interface TrialBalanceAccount {
  accountCode: string
  accountName: string
  accountType: AccountType
  debitBalance: number
  creditBalance: number
  netBalance: number
  normalSide: EntryType
}

/** Complete trial balance report */
export interface TrialBalance {
  tenantId: string
  asOfDate: Date
  accounts: TrialBalanceAccount[]
  totalDebits: number
  totalCredits: number
  isBalanced: boolean
}

// ---------------------------------------------------------------------------
// Income Statement
// ---------------------------------------------------------------------------

/** Income statement (profit & loss) report */
export interface IncomeStatement {
  tenantId: string
  startDate: Date
  endDate: Date
  revenue: Array<{ accountCode: string; accountName: string; amount: number }>
  totalRevenue: number
  expenses: Array<{ accountCode: string; accountName: string; amount: number }>
  totalExpenses: number
  netIncome: number
}

// ---------------------------------------------------------------------------
// Balance Sheet
// ---------------------------------------------------------------------------

/** Balance sheet report */
export interface BalanceSheet {
  tenantId: string
  asOfDate: Date
  assets: Array<{ accountCode: string; accountName: string; amount: number }>
  totalAssets: number
  liabilities: Array<{ accountCode: string; accountName: string; amount: number }>
  totalLiabilities: number
  equity: Array<{ accountCode: string; accountName: string; amount: number }>
  totalEquity: number
  totalLiabilitiesAndEquity: number
  isBalanced: boolean
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

/** A single transaction in a ledger account */
export interface LedgerEntry {
  journalEntryId: string
  date: Date
  description: string
  reference: string
  entryType: EntryType
  amount: number
  runningBalance: number
  status: string
}

/** Complete ledger for an account */
export interface AccountLedger {
  accountId: string
  accountCode: string
  accountName: string
  accountType: AccountType
  startDate: Date
  endDate: Date
  openingBalance: number
  entries: LedgerEntry[]
  closingBalance: number
}

// ---------------------------------------------------------------------------
// Payment Schedule
// ---------------------------------------------------------------------------

/** A planned farmer payment */
export interface PaymentScheduleItem {
  intakeId: string
  farmerId: string
  farmerName: string
  commodity: string
  phase: PaymentPhase
  estimatedAmount: number
  estimatedDeductions: number
  estimatedNetAmount: number
  status: 'SCHEDULED' | 'PROCESSING' | 'PAID' | 'CANCELLED'
  scheduledDate?: Date
}