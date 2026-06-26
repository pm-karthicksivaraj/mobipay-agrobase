import { NextResponse } from 'next/server'

/**
 * Health check endpoint for Docker/Kubernetes load balancers.
 * Returns 200 with system status. No auth required.
 */
export async function GET() {
  const start = Date.now()
  let dbStatus = 'ok'
  let dbLatencyMs = 0

  try {
    const { db } = await import('@/lib/db')
    const dbStart = Date.now()
    await db.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - dbStart
  } catch (err) {
    dbStatus = 'error'
    dbLatencyMs = -1
    console.error('[Health] Database check failed:', err)
  }

  const totalMs = Date.now() - start

  // Return 503 if database is down
  if (dbStatus === 'error') {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: { database: dbStatus, dbLatencyMs },
        responseTimeMs: totalMs,
      },
      { status: 503 }
    )
  }

  return NextResponse.json({
    status: 'healthy',
    version: process.env.npm_package_version || '0.2.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
    },
    checks: { database: dbStatus, dbLatencyMs },
    responseTimeMs: totalMs,
  })
}