/**
 * Agrobase V3 — V1 Schema Mapping
 * MobiPay AgroSys Limited
 *
 * Maps V1 MySQL tables to V3 Prisma models and defines column-level
 * transformations. Used by V1Migrator for field mapping during migration.
 */

// ---------------------------------------------------------------------------
// Table-Level Mapping: V1 MySQL Table → V3 Prisma Model
// ---------------------------------------------------------------------------

/**
 * Maps each V1 MySQL table to the corresponding V3 Prisma model
 * and the V3 migration method name.
 */
export const V1_SCHEMA_MAP: Record<string, {
  v3Model: string
  migrateMethod: string
  description: string
}> = {
  farmers: {
    v3Model: 'FarmerProfile',
    migrateMethod: 'migrateFarmers',
    description: 'Farmer demographic and contact information',
  },
  vsla_groups: {
    v3Model: 'VslaGroup',
    migrateMethod: 'migrateVslaGroups',
    description: 'VSLA savings and loan groups',
  },
  vsla_savings: {
    v3Model: 'VslaSaving',
    migrateMethod: 'migrateVslaSavings',
    description: 'VSLA member savings deposits',
  },
  vsla_loans: {
    v3Model: 'VslaLoan',
    migrateMethod: 'migrateVslaLoans',
    description: 'VSLA member loans',
  },
  payments: {
    v3Model: 'Payment',
    migrateMethod: 'migratePayments',
    description: 'Payment and disbursement records',
  },
  trainings: {
    v3Model: 'Training',
    migrateMethod: 'migrateTrainings',
    description: 'Farmer training sessions',
  },
}

// ---------------------------------------------------------------------------
// Column-Level Mapping: V1 Column → V3 Column (with transformations)
// ---------------------------------------------------------------------------

/**
 * Column mappings for each V1 table.
 * Each entry maps a V1 column name to the V3 column name
 * and an optional transform function name.
 *
 * Transforms:
 *   'identity'   — copy as-is
 *   'snakeToCamel' — convert snake_case to camelCase
 *   'dateParse'  — parse string to Date
 *   'jsonParse'  — parse JSON string
 *   'phoneNormalize' — normalize phone format
 */
export type ColumnTransform = 'identity' | 'snakeToCamel' | 'dateParse' | 'jsonParse' | 'phoneNormalize'

export interface ColumnMapping {
  v1Column: string
  v3Field: string
  transform: ColumnTransform
  required: boolean
  defaultValue?: unknown
}

/**
 * Field-level column mappings for each V1 table.
 */
export const V1_COLUMN_MAP: Record<string, ColumnMapping[]> = {
  // -------------------------------------------------------------------
  // farmers → FarmerProfile
  // -------------------------------------------------------------------
  farmers: [
    { v1Column: 'id',                 v3Field: 'id',                   transform: 'identity',       required: false },
    { v1Column: 'first_name',         v3Field: 'firstName',            transform: 'identity',       required: true },
    { v1Column: 'firstName',          v3Field: 'firstName',            transform: 'identity',       required: true },
    { v1Column: 'last_name',          v3Field: 'lastName',             transform: 'identity',       required: true },
    { v1Column: 'lastName',           v3Field: 'lastName',             transform: 'identity',       required: true },
    { v1Column: 'phone',              v3Field: 'phone',                transform: 'phoneNormalize', required: true },
    { v1Column: 'phone_number',       v3Field: 'phone',                transform: 'phoneNormalize', required: true },
    { v1Column: 'gender',             v3Field: 'gender',               transform: 'identity',       required: false },
    { v1Column: 'dob',                v3Field: 'dateOfBirth',          transform: 'dateParse',      required: false },
    { v1Column: 'date_of_birth',      v3Field: 'dateOfBirth',          transform: 'dateParse',      required: false },
    { v1Column: 'national_id',        v3Field: 'nationalIdNo',         transform: 'identity',       required: false },
    { v1Column: 'national_id_no',     v3Field: 'nationalIdNo',         transform: 'identity',       required: false },
    { v1Column: 'farmer_code',        v3Field: 'farmerCode',           transform: 'identity',       required: false },
    { v1Column: 'farmer_code',        v3Field: 'farmerCode',           transform: 'identity',       required: false },
    { v1Column: 'status',             v3Field: 'status',               transform: 'identity',       required: false, defaultValue: 'ACTIVE' },
    { v1Column: 'group_id',           v3Field: 'groupId',              transform: 'identity',       required: false },
    { v1Column: 'village_id',         v3Field: 'villageId',            transform: 'identity',       required: false },
    { v1Column: 'education',          v3Field: 'education',            transform: 'identity',       required: false },
    { v1Column: 'bank_name',          v3Field: 'bankName',             transform: 'identity',       required: false },
    { v1Column: 'bank_account_no',    v3Field: 'bankAccountNo',        transform: 'identity',       required: false },
    { v1Column: 'gps_latitude',       v3Field: 'gpsLatitude',          transform: 'identity',       required: false },
    { v1Column: 'gps_longitude',      v3Field: 'gpsLongitude',         transform: 'identity',       required: false },
    { v1Column: 'created_at',         v3Field: 'createdAt',            transform: 'dateParse',      required: false },
  ],

  // -------------------------------------------------------------------
  // vsla_groups → VslaGroup
  // -------------------------------------------------------------------
  vsla_groups: [
    { v1Column: 'id',                 v3Field: 'id',                   transform: 'identity',       required: false },
    { v1Column: 'name',               v3Field: 'name',                 transform: 'identity',       required: true },
    { v1Column: 'share_value',        v3Field: 'shareValue',           transform: 'identity',       required: true, defaultValue: 0 },
    { v1Column: 'loan_rate',          v3Field: 'loanRate',             transform: 'identity',       required: true, defaultValue: 10 },
    { v1Column: 'max_loan_amount',    v3Field: 'maxLoanAmount',        transform: 'identity',       required: true, defaultValue: 0 },
    { v1Column: 'fines',              v3Field: 'fines',                transform: 'identity',       required: false, defaultValue: 0 },
    { v1Column: 'welfare_amount',     v3Field: 'welfareAmount',         transform: 'identity',       required: false, defaultValue: 0 },
    { v1Column: 'meeting_frequency',  v3Field: 'meetingFrequency',      transform: 'identity',       required: false },
    { v1Column: 'group_id',           v3Field: 'groupId',              transform: 'identity',       required: false },
    { v1Column: 'is_active',          v3Field: 'isActive',             transform: 'identity',       required: false, defaultValue: true },
    { v1Column: 'created_at',         v3Field: 'createdAt',            transform: 'dateParse',      required: false },
  ],

  // -------------------------------------------------------------------
  // vsla_savings → VslaSaving
  // -------------------------------------------------------------------
  vsla_savings: [
    { v1Column: 'id',                 v3Field: 'id',                   transform: 'identity',       required: false },
    { v1Column: 'vsla_group_id',      v3Field: 'vslaGroupId',          transform: 'identity',       required: true },
    { v1Column: 'farmer_id',          v3Field: 'farmerId',             transform: 'identity',       required: true },
    { v1Column: 'amount',             v3Field: 'amount',               transform: 'identity',       required: true },
    { v1Column: 'shares_bought',      v3Field: 'sharesBought',         transform: 'identity',       required: false, defaultValue: 1 },
    { v1Column: 'saved_on_behalf_of', v3Field: 'savedOnBehalfOf',      transform: 'identity',       required: false },
    { v1Column: 'transaction_ref',    v3Field: 'transactionRef',       transform: 'identity',       required: false },
    { v1Column: 'status',             v3Field: 'status',               transform: 'identity',       required: false, defaultValue: 'COMPLETED' },
    { v1Column: 'created_at',         v3Field: 'createdAt',            transform: 'dateParse',      required: false },
  ],

  // -------------------------------------------------------------------
  // vsla_loans → VslaLoan
  // -------------------------------------------------------------------
  vsla_loans: [
    { v1Column: 'id',                 v3Field: 'id',                   transform: 'identity',       required: false },
    { v1Column: 'vsla_group_id',      v3Field: 'vslaGroupId',          transform: 'identity',       required: true },
    { v1Column: 'farmer_id',          v3Field: 'farmerId',             transform: 'identity',       required: true },
    { v1Column: 'amount',             v3Field: 'amount',               transform: 'identity',       required: true },
    { v1Column: 'interest_rate',      v3Field: 'interestRate',         transform: 'identity',       required: true },
    { v1Column: 'total_repayable',    v3Field: 'totalRepayable',       transform: 'identity',       required: true },
    { v1Column: 'amount_repaid',      v3Field: 'amountRepaid',         transform: 'identity',       required: false, defaultValue: 0 },
    { v1Column: 'purpose',            v3Field: 'purpose',              transform: 'identity',       required: false },
    { v1Column: 'status',             v3Field: 'status',               transform: 'identity',       required: false, defaultValue: 'PENDING' },
    { v1Column: 'requested_at',       v3Field: 'requestedAt',          transform: 'dateParse',      required: false },
    { v1Column: 'approved_at',        v3Field: 'approvedAt',           transform: 'dateParse',      required: false },
    { v1Column: 'disbursed_at',       v3Field: 'disbursedAt',          transform: 'dateParse',      required: false },
    { v1Column: 'due_date',           v3Field: 'dueDate',              transform: 'dateParse',      required: false },
    { v1Column: 'created_at',         v3Field: 'createdAt',            transform: 'dateParse',      required: false },
  ],

  // -------------------------------------------------------------------
  // payments → Payment
  // -------------------------------------------------------------------
  payments: [
    { v1Column: 'id',                 v3Field: 'id',                   transform: 'identity',       required: false },
    { v1Column: 'type',               v3Field: 'type',                 transform: 'identity',       required: true },
    { v1Column: 'recipient_name',     v3Field: 'recipientName',        transform: 'identity',       required: true },
    { v1Column: 'phone',              v3Field: 'recipientPhone',       transform: 'phoneNormalize', required: true },
    { v1Column: 'recipient_phone',    v3Field: 'recipientPhone',       transform: 'phoneNormalize', required: true },
    { v1Column: 'amount',             v3Field: 'amount',               transform: 'identity',       required: true },
    { v1Column: 'description',        v3Field: 'description',          transform: 'identity',       required: false },
    { v1Column: 'transaction_ref',    v3Field: 'transactionRef',       transform: 'identity',       required: false },
    { v1Column: 'status',             v3Field: 'status',               transform: 'identity',       required: false, defaultValue: 'COMPLETED' },
    { v1Column: 'created_at',         v3Field: 'createdAt',            transform: 'dateParse',      required: false },
  ],

  // -------------------------------------------------------------------
  // trainings → Training
  // -------------------------------------------------------------------
  trainings: [
    { v1Column: 'id',                 v3Field: 'id',                   transform: 'identity',       required: false },
    { v1Column: 'topic',              v3Field: 'topic',                transform: 'identity',       required: true },
    { v1Column: 'description',        v3Field: 'description',          transform: 'identity',       required: false },
    { v1Column: 'date',               v3Field: 'date',                 transform: 'dateParse',      required: true },
    { v1Column: 'location',           v3Field: 'location',             transform: 'identity',       required: false },
    { v1Column: 'trainer_name',       v3Field: 'trainerName',          transform: 'identity',       required: false },
    { v1Column: 'created_at',         v3Field: 'createdAt',            transform: 'dateParse',      required: false },
  ],
}