import { NextResponse } from 'next/server'

/**
 * Migration V1 Status endpoint.
 * Returns the current status and progress of the V1 → V3 data migration.
 */
export async function GET() {
  try {
    // Migration status — this is a static/incremental tracker
    // In a real implementation, this would query a MigrationLog table or external state
    const migrationStatus = {
      version: 'v1-to-v3',
      status: 'IN_PROGRESS', // PENDING, IN_PROGRESS, COMPLETED, FAILED
      startedAt: '2025-01-01T00:00:00Z',
      completedAt: null,
      phases: [
        { name: 'schema_setup', status: 'COMPLETED', progress: 100 },
        { name: 'tenant_hierarchy', status: 'COMPLETED', progress: 100 },
        { name: 'user_migration', status: 'COMPLETED', progress: 100 },
        { name: 'farmer_migration', status: 'IN_PROGRESS', progress: 75 },
        { name: 'vsla_migration', status: 'PENDING', progress: 0 },
        { name: 'financial_migration', status: 'PENDING', progress: 0 },
        { name: 'marketplace_migration', status: 'PENDING', progress: 0 },
        { name: 'training_migration', status: 'PENDING', progress: 0 },
        { name: 'compliance_migration', status: 'PENDING', progress: 0 },
        { name: 'verification', status: 'PENDING', progress: 0 },
      ],
      overallProgress: 37, // percentage
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json({ data: migrationStatus })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch migration status' }, { status: 500 })
  }
}