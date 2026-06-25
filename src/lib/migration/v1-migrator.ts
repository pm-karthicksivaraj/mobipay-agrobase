/**
 * Agrobase V3 — V1 Migration Engine
 * MobiPay AgroSys Limited
 *
 * V1Migrator class for migrating data from Agrobase V1 (MySQL) to V3 (Prisma/SQLite).
 * Features:
 *   - Batch migration (1000/batch)
 *   - IdMapping table for V1→V3 ID tracking
 *   - MigrationLog entry for each operation
 *   - Dry-run support
 *   - Validation and reporting
 *
 * The v1Db parameter is an object that provides raw SQL access to the V1 database.
 * In production, this would be a MySQL connection; for testing, it can be mocked.
 */

import { db } from '@/lib/db'
import { V1_SCHEMA_MAP, V1_COLUMN_MAP } from './v1-schema-map'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal interface for a V1 database connection */
export interface V1Database {
  query(sql: string, params?: unknown[]): Promise<unknown[]>
}

export interface MigrationResult {
  tableName: string
  totalRecords: number
  migratedRecords: number
  failedRecords: number
  skippedRecords: number
  status: string
  errors: string[]
  durationMs: number
}

export interface MigrationReport {
  startTime: Date
  endTime: Date
  dryRun: boolean
  targetTenantId: string
  migrations: MigrationResult[]
  summary: {
    totalTables: number
    totalRecords: number
    totalMigrated: number
    totalFailed: number
  }
}

// ---------------------------------------------------------------------------
// V1Migrator Class
// ---------------------------------------------------------------------------

const BATCH_SIZE = 1000

export class V1Migrator {
  private v1Db: V1Database
  private targetTenantId: string
  private dryRun: boolean
  private executedBy: string
  private results: MigrationResult[] = []

  constructor(v1Db: V1Database, targetTenantId: string, options?: { dryRun?: boolean; executedBy?: string }) {
    this.v1Db = v1Db
    this.targetTenantId = targetTenantId
    this.dryRun = options?.dryRun ?? false
    this.executedBy = options?.executedBy ?? 'system'
  }

  // -----------------------------------------------------------------------
  // Migrate Farmers (1000/batch)
  // -----------------------------------------------------------------------

  /**
   * Migrate farmers from V1 to V3 FarmerProfile.
   * Batch size: 1000 records per batch.
   */
  async migrateFarmers(): Promise<MigrationResult> {
    const startTime = Date.now()
    const errors: string[] = []
    let migratedRecords = 0
    let failedRecords = 0

    const migrationLog = await this.createMigrationLog('farmers')

    try {
      // Count source records
      const countResult = await this.v1Db.query('SELECT COUNT(*) as cnt FROM farmers')
      const totalRecords = (countResult[0] as Record<string, number>)?.cnt ?? 0

      // Process in batches
      let offset = 0
      while (offset < totalRecords) {
        const rows = await this.v1Db.query(
          'SELECT * FROM farmers LIMIT ? OFFSET ?',
          [BATCH_SIZE, offset],
        ) as Record<string, unknown>[]

        if (rows.length === 0) break

        for (const row of rows) {
          try {
            const v1Id = String(row.id)

            if (this.dryRun) {
              migratedRecords++
              continue
            }

            // Map V1 columns to V3 using schema map
            const profile = await db.farmerProfile.create({
              data: {
                tenantId: this.targetTenantId,
                firstName: String(row.first_name ?? row.firstName ?? ''),
                lastName: String(row.last_name ?? row.lastName ?? ''),
                phone: String(row.phone ?? row.phone_number ?? ''),
                gender: row.gender ? String(row.gender) : undefined,
                dateOfBirth: row.dob ? new Date(String(row.dob)) : undefined,
                nationalIdNo: row.national_id ?? row.national_id_no ? String(row.national_id ?? row.national_id_no) : undefined,
                farmerCode: row.farmer_code ? String(row.farmer_code) : undefined,
                status: (row.status as string) === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
              },
            })

            // Store ID mapping
            await db.idMapping.create({
              tableName: 'farmers',
              v1Id,
              v3Id: profile.id,
            })

            migratedRecords++
          } catch (error) {
            failedRecords++
            const msg = error instanceof Error ? error.message : String(error)
            errors.push(`Farmer ${row.id}: ${msg}`)
          }
        }

        offset += BATCH_SIZE
      }

      // Update migration log
      await this.updateMigrationLog(migrationLog.id, {
        totalRecords,
        migratedRecords,
        failedRecords,
        skippedRecords: 0,
        status: failedRecords === 0 ? 'COMPLETED' : 'PARTIAL',
        errors,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await this.updateMigrationLog(migrationLog.id, {
        totalRecords: 0,
        migratedRecords,
        failedRecords,
        skippedRecords: 0,
        status: 'FAILED',
        errors: [msg],
      })
    }

    const result: MigrationResult = {
      tableName: 'farmers',
      totalRecords: migratedRecords + failedRecords,
      migratedRecords,
      failedRecords,
      skippedRecords: 0,
      status: failedRecords === 0 ? 'COMPLETED' : 'PARTIAL',
      errors,
      durationMs: Date.now() - startTime,
    }

    this.results.push(result)
    return result
  }

  // -----------------------------------------------------------------------
  // Migrate VSLA Groups
  // -----------------------------------------------------------------------

  /**
   * Migrate VSLA groups from V1 to V3.
   */
  async migrateVslaGroups(): Promise<MigrationResult> {
    const startTime = Date.now()
    const errors: string[] = []
    let migratedRecords = 0
    let failedRecords = 0

    const migrationLog = await this.createMigrationLog('vsla_groups')

    try {
      const countResult = await this.v1Db.query('SELECT COUNT(*) as cnt FROM vsla_groups')
      const totalRecords = (countResult[0] as Record<string, number>)?.cnt ?? 0

      let offset = 0
      while (offset < totalRecords) {
        const rows = await this.v1Db.query(
          'SELECT * FROM vsla_groups LIMIT ? OFFSET ?',
          [BATCH_SIZE, offset],
        ) as Record<string, unknown>[]

        if (rows.length === 0) break

        for (const row of rows) {
          try {
            const v1Id = String(row.id)

            if (this.dryRun) {
              migratedRecords++
              continue
            }

            const vslaSettings = JSON.stringify({
              shareValue: row.share_value ?? 0,
              loanRate: row.loan_rate ?? 10,
              maxLoanAmount: row.max_loan_amount ?? 0,
              fines: row.fines ?? 0,
              welfareAmount: row.welfare_amount ?? 0,
            })

            const group = await db.vslaGroup.create({
              data: {
                tenantId: this.targetTenantId,
                name: String(row.name ?? ''),
                shareValue: Number(row.share_value ?? 0),
                loanRate: Number(row.loan_rate ?? 10),
                maxLoanAmount: Number(row.max_loan_amount ?? 0),
                fines: Number(row.fines ?? 0),
                welfareAmount: Number(row.welfare_amount ?? 0),
                meetingFrequency: row.meeting_frequency ? String(row.meeting_frequency) : undefined,
              },
            })

            await db.idMapping.create({
              tableName: 'vsla_groups',
              v1Id,
              v3Id: group.id,
            })

            migratedRecords++
          } catch (error) {
            failedRecords++
            errors.push(`VSLA Group ${row.id}: ${error instanceof Error ? error.message : String(error)}`)
          }
        }

        offset += BATCH_SIZE
      }

      await this.updateMigrationLog(migrationLog.id, {
        totalRecords,
        migratedRecords,
        failedRecords,
        skippedRecords: 0,
        status: failedRecords === 0 ? 'COMPLETED' : 'PARTIAL',
        errors,
      })
    } catch (error) {
      await this.updateMigrationLog(migrationLog.id, {
        totalRecords: 0,
        migratedRecords,
        failedRecords,
        skippedRecords: 0,
        status: 'FAILED',
        errors: [error instanceof Error ? error.message : String(error)],
      })
    }

    const result: MigrationResult = {
      tableName: 'vsla_groups',
      totalRecords: migratedRecords + failedRecords,
      migratedRecords,
      failedRecords,
      skippedRecords: 0,
      status: failedRecords === 0 ? 'COMPLETED' : 'PARTIAL',
      errors,
      durationMs: Date.now() - startTime,
    }

    this.results.push(result)
    return result
  }

  // -----------------------------------------------------------------------
  // Migrate Payments
  // -----------------------------------------------------------------------

  /**
   * Migrate payment records from V1 to V3.
   */
  async migratePayments(): Promise<MigrationResult> {
    const startTime = Date.now()
    const errors: string[] = []
    let migratedRecords = 0
    let failedRecords = 0

    const migrationLog = await this.createMigrationLog('payments')

    try {
      const countResult = await this.v1Db.query('SELECT COUNT(*) as cnt FROM payments')
      const totalRecords = (countResult[0] as Record<string, number>)?.cnt ?? 0

      let offset = 0
      while (offset < totalRecords) {
        const rows = await this.v1Db.query(
          'SELECT * FROM payments LIMIT ? OFFSET ?',
          [BATCH_SIZE, offset],
        ) as Record<string, unknown>[]

        if (rows.length === 0) break

        for (const row of rows) {
          try {
            const v1Id = String(row.id)

            if (this.dryRun) {
              migratedRecords++
              continue
            }

            const payment = await db.payment.create({
              data: {
                type: String(row.type ?? 'CASUAL'),
                recipientName: String(row.recipient_name ?? ''),
                recipientPhone: String(row.phone ?? row.recipient_phone ?? ''),
                amount: Number(row.amount ?? 0),
                description: row.description ? String(row.description) : undefined,
                transactionRef: row.transaction_ref ? String(row.transaction_ref) : undefined,
                status: String(row.status ?? 'COMPLETED'),
              },
            })

            await db.idMapping.create({
              tableName: 'payments',
              v1Id,
              v3Id: payment.id,
            })

            migratedRecords++
          } catch (error) {
            failedRecords++
            errors.push(`Payment ${row.id}: ${error instanceof Error ? error.message : String(error)}`)
          }
        }

        offset += BATCH_SIZE
      }

      await this.updateMigrationLog(migrationLog.id, {
        totalRecords,
        migratedRecords,
        failedRecords,
        skippedRecords: 0,
        status: failedRecords === 0 ? 'COMPLETED' : 'PARTIAL',
        errors,
      })
    } catch (error) {
      await this.updateMigrationLog(migrationLog.id, {
        totalRecords: 0,
        migratedRecords,
        failedRecords,
        skippedRecords: 0,
        status: 'FAILED',
        errors: [error instanceof Error ? error.message : String(error)],
      })
    }

    const result: MigrationResult = {
      tableName: 'payments',
      totalRecords: migratedRecords + failedRecords,
      migratedRecords,
      failedRecords,
      skippedRecords: 0,
      status: failedRecords === 0 ? 'COMPLETED' : 'PARTIAL',
      errors,
      durationMs: Date.now() - startTime,
    }

    this.results.push(result)
    return result
  }

  // -----------------------------------------------------------------------
  // Migrate Trainings
  // -----------------------------------------------------------------------

  /**
   * Migrate training records from V1 to V3.
   */
  async migrateTrainings(): Promise<MigrationResult> {
    const startTime = Date.now()
    const errors: string[] = []
    let migratedRecords = 0
    let failedRecords = 0

    const migrationLog = await this.createMigrationLog('trainings')

    try {
      const countResult = await this.v1Db.query('SELECT COUNT(*) as cnt FROM trainings')
      const totalRecords = (countResult[0] as Record<string, number>)?.cnt ?? 0

      let offset = 0
      while (offset < totalRecords) {
        const rows = await this.v1Db.query(
          'SELECT * FROM trainings LIMIT ? OFFSET ?',
          [BATCH_SIZE, offset],
        ) as Record<string, unknown>[]

        if (rows.length === 0) break

        for (const row of rows) {
          try {
            const v1Id = String(row.id)

            if (this.dryRun) {
              migratedRecords++
              continue
            }

            const training = await db.training.create({
              data: {
                tenantId: this.targetTenantId,
                topic: String(row.topic ?? ''),
                description: row.description ? String(row.description) : undefined,
                date: row.date ? new Date(String(row.date)) : new Date(),
                location: row.location ? String(row.location) : undefined,
                trainerName: row.trainer_name ? String(row.trainer_name) : undefined,
              },
            })

            await db.idMapping.create({
              tableName: 'trainings',
              v1Id,
              v3Id: training.id,
            })

            migratedRecords++
          } catch (error) {
            failedRecords++
            errors.push(`Training ${row.id}: ${error instanceof Error ? error.message : String(error)}`)
          }
        }

        offset += BATCH_SIZE
      }

      await this.updateMigrationLog(migrationLog.id, {
        totalRecords,
        migratedRecords,
        failedRecords,
        skippedRecords: 0,
        status: failedRecords === 0 ? 'COMPLETED' : 'PARTIAL',
        errors,
      })
    } catch (error) {
      await this.updateMigrationLog(migrationLog.id, {
        totalRecords: 0,
        migratedRecords,
        failedRecords,
        skippedRecords: 0,
        status: 'FAILED',
        errors: [error instanceof Error ? error.message : String(error)],
      })
    }

    const result: MigrationResult = {
      tableName: 'trainings',
      totalRecords: migratedRecords + failedRecords,
      migratedRecords,
      failedRecords,
      skippedRecords: 0,
      status: failedRecords === 0 ? 'COMPLETED' : 'PARTIAL',
      errors,
      durationMs: Date.now() - startTime,
    }

    this.results.push(result)
    return result
  }

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  /**
   * Validate that migration counts match source counts.
   * Throws an error if counts don't match (unless dry-run).
   */
  validateMigration(
    tableName: string,
    sourceCount: number,
    targetCount: number,
  ): void {
    if (sourceCount !== targetCount) {
      const msg = `Validation failed for ${tableName}: source=${sourceCount}, target=${targetCount}`
      console.error(`[V1Migrator] ${msg}`)
      if (!this.dryRun) {
        throw new Error(msg)
      }
    } else {
      console.log(`[V1Migrator] Validation passed for ${tableName}: ${sourceCount} records`)
    }
  }

  // -----------------------------------------------------------------------
  // Report
  // -----------------------------------------------------------------------

  /**
   * Generate a summary report of all migrations run in this session.
   */
  generateReport(): MigrationReport {
    const endTime = new Date()

    return {
      startTime: this.results.length > 0 ? new Date(endTime.getTime() - this.results.reduce((s, r) => s + r.durationMs, 0)) : endTime,
      endTime,
      dryRun: this.dryRun,
      targetTenantId: this.targetTenantId,
      migrations: this.results,
      summary: {
        totalTables: this.results.length,
        totalRecords: this.results.reduce((s, r) => s + r.totalRecords, 0),
        totalMigrated: this.results.reduce((s, r) => s + r.migratedRecords, 0),
        totalFailed: this.results.reduce((s, r) => s + r.failedRecords, 0),
      },
    }
  }

  // -----------------------------------------------------------------------
  // Internal: MigrationLog helpers
  // -----------------------------------------------------------------------

  private async createMigrationLog(tableName: string) {
    return db.migrationLog.create({
      data: {
        tableName,
        totalRecords: 0,
        migratedRecords: 0,
        failedRecords: 0,
        skippedRecords: 0,
        status: 'PENDING',
        startedAt: new Date(),
        executedBy: this.executedBy,
      },
    })
  }

  private async updateMigrationLog(
    logId: string,
    data: {
      totalRecords: number
      migratedRecords: number
      failedRecords: number
      skippedRecords: number
      status: string
      errors: string[]
    },
  ) {
    await db.migrationLog.update({
      where: { id: logId },
      data: {
        ...data,
        completedAt: data.status !== 'IN_PROGRESS' ? new Date() : undefined,
        errorLog: data.errors.length > 0 ? JSON.stringify(data.errors) : undefined,
      },
    })
  }
}