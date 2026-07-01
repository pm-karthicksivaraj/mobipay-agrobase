/**
 * Database Backup Script
 *
 * Creates a logical backup of the Neon PostgreSQL database and optionally
 * uploads it to S3-compatible storage.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/backup-database.ts
 *
 * Or set up as a Vercel cron job that hits /api/admin/cron/backup
 *
 * For Neon PITR (Point-in-Time Recovery):
 *   - PITR is enabled by default on all Neon paid plans ($19/mo+)
 *   - No configuration needed — Neon keeps 7 days of WAL history
 *   - Restore to any point in the last 7 days via Neon dashboard
 *
 * For S3 backup:
 *   - Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET env vars
 *   - Script uploads a .sql.gz dump daily
 *   - Retention: 30 days (configurable)
 */

import 'dotenv/config'
import { execSync } from 'child_process'
import { createGzip } from 'zlib'
import { createReadStream, createWriteStream, readFileSync } from 'fs'
import { mkdirSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'

const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/agrobase-backups'
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30')
const S3_BUCKET = process.env.S3_BUCKET || ''
const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL || ''

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required')
  process.exit(1)
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = join(BACKUP_DIR, `agrobase-backup-${timestamp}.sql`)
  const gzipFile = `${backupFile}.gz`

  console.log(`🔄 Starting database backup...`)
  console.log(`   Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`)
  console.log(`   Output: ${gzipFile}`)

  // Ensure backup directory exists
  mkdirSync(BACKUP_DIR, { recursive: true })

  // Step 1: Create logical dump using pg_dump
  console.log('\n📦 Creating pg_dump...')
  try {
    // Parse DATABASE_URL to construct pg_dump command
    const url = new URL(DATABASE_URL)
    const host = url.hostname
    const port = url.port || '5432'
    const database = url.pathname.slice(1)
    const username = url.username
    const password = url.password

    const env = { ...process.env, PGPASSWORD: password }
    const cmd = `pg_dump --host=${host} --port=${port} --username=${username} --dbname=${database} --no-owner --no-privileges --format=plain --file=${backupFile}`

    execSync(cmd, { env, stdio: 'inherit' })
    console.log(`✅ Dump created: ${backupFile}`)
  } catch (error) {
    console.error('❌ pg_dump failed. Is pg_dump installed? Try: apt-get install postgresql-client')
    console.error('   Alternatively, use Neon\'s built-in backup via dashboard')
    process.exit(1)
  }

  // Step 2: Gzip the dump
  console.log('\n🗜️  Compressing...')
  try {
    const input = createReadStream(backupFile)
    const output = createWriteStream(gzipFile)
    const gzip = createGzip()

    await new Promise<void>((resolve, reject) => {
      input.pipe(gzip).pipe(output)
      output.on('finish', resolve)
      output.on('error', reject)
    })

    // Remove uncompressed file
    unlinkSync(backupFile)
    console.log(`✅ Compressed: ${gzipFile}`)
  } catch (error) {
    console.error('❌ Compression failed:', error)
    process.exit(1)
  }

  // Step 3: Upload to S3 (if configured)
  if (S3_BUCKET) {
    console.log(`\n☁️  Uploading to S3 bucket: ${S3_BUCKET}...`)
    try {
      const s3Key = `backups/agrobase/${timestamp}.sql.gz`
      const cmd = `aws s3 cp ${gzipFile} s3://${S3_BUCKET}/${s3Key} --storage-class STANDARD_IA`
      execSync(cmd, { stdio: 'inherit' })
      console.log(`✅ Uploaded to s3://${S3_BUCKET}/${s3Key}`)

      // Clean up local file after successful upload
      if (existsSync(gzipFile)) {
        unlinkSync(gzipFile)
        console.log(`🗑️  Cleaned up local file`)
      }
    } catch (error) {
      console.error('⚠️  S3 upload failed (local backup retained):', error)
    }
  } else {
    console.log(`\nℹ️  S3_BUCKET not set — keeping local backup at ${gzipFile}`)
  }

  // Step 4: Clean up old local backups
  console.log(`\n🧹 Cleaning up backups older than ${RETENTION_DAYS} days...`)
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000)
    const listCmd = `find ${BACKUP_DIR} -name "agrobase-backup-*.sql.gz" -type f`
    const files = execSync(listCmd).toString().trim().split('\n').filter(Boolean)

    let deleted = 0
    for (const file of files) {
      const stat = execSync(`stat -c %Y "${file}"`).toString().trim()
      const fileDate = new Date(parseInt(stat) * 1000)
      if (fileDate < cutoff) {
        unlinkSync(file)
        deleted++
      }
    }
    console.log(`✅ Deleted ${deleted} old backup(s)`)
  } catch (error) {
    console.error('⚠️  Cleanup failed:', error)
  }

  console.log('\n✅ Backup complete!')
  console.log(`   File: ${gzipFile}`)
  console.log(`   Retention: ${RETENTION_DAYS} days`)

  // Step 5: Print restore instructions
  console.log('\n📋 To restore:')
  console.log(`   gunzip < ${gzipFile} | psql "${DATABASE_URL}"`)
}

main().catch(e => { console.error(e); process.exit(1) })
