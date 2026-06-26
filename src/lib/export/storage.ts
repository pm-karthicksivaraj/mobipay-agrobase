/**
 * Agrobase V3 — S3/MinIO Storage Adapter
 *
 * Lightweight S3-compatible client using native fetch + AWS Signature V4.
 * No SDK dependency — works with AWS S3, MinIO, DigitalOcean Spaces, etc.
 *
 * Features:
 *   - Upload (PutObject)
 *   - GetObject (stream to buffer)
 *   - DeleteObject
 *   - HeadObject (metadata + size)
 *   - Presigned GET URL generation
 *   - Automatic Content-Type detection
 *   - Configurable endpoint (supports MinIO path-style)
 */

import { createHash, createHmac } from 'crypto'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface S3Config {
  endpoint: string
  region: string
  bucket: string
  accessKey: string
  secretKey: string
  forcePathStyle: boolean
  useSSL: boolean
}

function getS3Config(): S3Config {
  const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000'
  const useSSL = process.env.S3_USE_SSL === 'true' || endpoint.startsWith('https://')

  return {
    endpoint,
    region: process.env.S3_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'agrobase-exports',
    accessKey: process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.S3_SECRET_KEY || '',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false', // default true for MinIO
    useSSL,
  }
}

// ---------------------------------------------------------------------------
// Content-Type helpers
// ---------------------------------------------------------------------------

const CONTENT_TYPES: Record<string, string> = {
  csv: 'text/csv',
  json: 'application/json',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

function getContentType(extension: string): string {
  return CONTENT_TYPES[extension.toLowerCase()] || 'application/octet-stream'
}

// ---------------------------------------------------------------------------
// AWS Signature V4
// ---------------------------------------------------------------------------

function encodeUriComponentRFC3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

async function signV4(
  config: S3Config,
  method: string,
  path: string,
  queryString: string,
  headers: Record<string, string>,
  payloadHash: string,
): Promise<Record<string, string>> {
  const now = new Date()
  const dateStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const dateDay = dateStamp.slice(0, 8)

  const signedHeaders = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort()
    .join(';')

  const canonicalHeaders = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort()
    .map((k) => `${k}:${headers[k].trim()}`)
    .join('\n') + '\n'

  const credentialScope = `${dateDay}/${config.region}/s3/aws4_request`
  const canonicalRequest = [
    method,
    path,
    queryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateStamp,
    credentialScope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n')

  // Derive signing key
  const kDate = hmacSha256(`AWS4${config.secretKey}`, dateDay)
  const kRegion = hmacSha256(kDate, config.region)
  const kService = hmacSha256(kRegion, 's3')
  const kSigning = hmacSha256(kService, 'aws4_request')
  const signature = hmacSha256(kSigning, stringToSign, 'hex')

  return {
    'x-amz-date': dateStamp,
    'x-amz-content-sha256': payloadHash,
    Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  }
}

function hmacSha256(key: string | Buffer, data: string, encoding?: 'hex'): Buffer | string {
  return createHmac('sha256', key).update(data, 'utf8').digest(encoding as any)
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

function buildUrl(config: S3Config, key: string, queryString?: string): string {
  if (config.forcePathStyle) {
    // MinIO path-style: http://endpoint/bucket/key
    const base = `${config.endpoint}/${config.bucket}/${encodeUriComponentRFC3986(key)}`
    return queryString ? `${base}?${queryString}` : base
  }
  // Virtual-hosted style: http://bucket.endpoint/key
  const url = new URL(config.endpoint)
  url.hostname = `${config.bucket}.${url.hostname}`
  url.pathname = `/${encodeUriComponentRFC3986(key)}`
  if (queryString) url.search = queryString
  return url.toString()
}

// ---------------------------------------------------------------------------
// S3StorageClient
// ---------------------------------------------------------------------------

export class S3StorageClient {
  private config: S3Config

  constructor(config?: Partial<S3Config>) {
    this.config = { ...getS3Config(), ...config }
  }

  /**
   * Check if S3 is configured (has credentials)
   */
  isConfigured(): boolean {
    return !!(this.config.accessKey && this.config.secretKey && this.config.bucket)
  }

  /**
   * Upload a buffer to S3/MinIO
   */
  async upload(key: string, data: Buffer, contentType?: string): Promise<{ size: number; etag: string }> {
    const ext = key.split('.').pop() || ''
    const ct = contentType || getContentType(ext)
    const payloadHash = createHash('sha256').update(data).digest('hex')

    const host = new URL(this.config.endpoint).host
    const headers: Record<string, string> = {
      Host: host,
      'Content-Type': ct,
    }

    const sigHeaders = await signV4(this.config, 'PUT', `/${this.config.bucket}/${key}`, '', headers, payloadHash)

    const url = buildUrl(this.config, key)
    const res = await fetch(url, {
      method: 'PUT',
      headers: { ...headers, ...sigHeaders },
      body: new Uint8Array(data),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`S3 upload failed (${res.status}): ${body}`)
    }

    const etag = res.headers.get('etag')?.replace(/"/g, '') || ''
    return { size: data.length, etag }
  }

  /**
   * Download an object from S3/MinIO as a Buffer
   */
  async download(key: string): Promise<Buffer> {
    const host = new URL(this.config.endpoint).host
    const headers: Record<string, string> = { Host: host }

    const sigHeaders = await signV4(this.config, 'GET', `/${this.config.bucket}/${key}`, '', headers, 'UNSIGNED-PAYLOAD')

    const url = buildUrl(this.config, key)
    const res = await fetch(url, {
      method: 'GET',
      headers: { ...headers, ...sigHeaders },
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`S3 download failed (${res.status}): ${body}`)
    }

    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  /**
   * Delete an object from S3/MinIO
   */
  async delete(key: string): Promise<void> {
    const host = new URL(this.config.endpoint).host
    const headers: Record<string, string> = { Host: host }

    const sigHeaders = await signV4(this.config, 'DELETE', `/${this.config.bucket}/${key}`, '', headers, 'UNSIGNED-PAYLOAD')

    const url = buildUrl(this.config, key)
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { ...headers, ...sigHeaders },
    })

    // 204 is success, 404 means already gone — both OK
    if (res.status !== 204 && res.status !== 404) {
      const body = await res.text()
      throw new Error(`S3 delete failed (${res.status}): ${body}`)
    }
  }

  /**
   * Head an object — get metadata without downloading
   */
  async head(key: string): Promise<{ size: number; lastModified: string; contentType: string } | null> {
    const host = new URL(this.config.endpoint).host
    const headers: Record<string, string> = { Host: host }

    const sigHeaders = await signV4(this.config, 'HEAD', `/${this.config.bucket}/${key}`, '', headers, 'UNSIGNED-PAYLOAD')

    const url = buildUrl(this.config, key)
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { ...headers, ...sigHeaders },
    })

    if (res.status === 404) return null
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`S3 head failed (${res.status}): ${body}`)
    }

    return {
      size: parseInt(res.headers.get('content-length') || '0', 10),
      lastModified: res.headers.get('last-modified') || '',
      contentType: res.headers.get('content-type') || 'application/octet-stream',
    }
  }

  /**
   * Generate a presigned GET URL (valid for ttlSeconds)
   * This constructs a signed URL without making any network calls.
   */
  presignedGetUrl(key: string, ttlSeconds: number = 3600): string {
    const now = new Date()
    const dateStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const dateDay = dateStamp.slice(0, 8)
    const expires = Math.floor(now.getTime() / 1000) + ttlSeconds

    const host = new URL(this.config.endpoint).host
    const headers: Record<string, string> = { host }

    const queryString = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encodeUriComponentRFC3986(`${this.config.accessKey}/${dateDay}/${this.config.region}/s3/aws4_request`)}&X-Amz-Date=${dateStamp}&X-Amz-Expires=${expires}&X-Amz-SignedHeaders=host`

    const signedHeaders = 'host'
    const canonicalRequest = [
      'GET',
      `/${this.config.bucket}/${key}`,
      queryString,
      `host:${host}\n`,
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n')

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      dateStamp,
      `${dateDay}/${this.config.region}/s3/aws4_request`,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n')

    const kDate = hmacSha256(`AWS4${this.config.secretKey}`, dateDay)
    const kRegion = hmacSha256(kDate, this.config.region)
    const kService = hmacSha256(kRegion, 's3')
    const kSigning = hmacSha256(kService, 'aws4_request')
    const signature = hmacSha256(kSigning, stringToSign, 'hex')

    if (this.config.forcePathStyle) {
      return `${this.config.endpoint}/${this.config.bucket}/${encodeUriComponentRFC3986(key)}?${queryString}&X-Amz-Signature=${signature}`
    }
    const url = new URL(this.config.endpoint)
    url.hostname = `${this.config.bucket}.${url.hostname}`
    url.pathname = `/${encodeUriComponentRFC3986(key)}`
    url.search = `${queryString}&X-Amz-Signature=${signature}`
    return url.toString()
  }

  /**
   * Build the S3 object key for a tenant export
   */
  buildKey(tenantId: string, exportType: string, format: string): string {
    const ts = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0]
    const ext = format.toLowerCase()
    return `exports/${tenantId}/${exportType}_${ts}.${ext}`
  }
}

// Singleton
export const s3Client = new S3StorageClient()