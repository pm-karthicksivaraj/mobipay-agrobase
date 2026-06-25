import * as crypto from 'node:crypto'
import { db } from '@/lib/db'
import type { WebhookEventName, WebhookPayload } from './types'

class WebhookManager {
  async registerEndpoint(
    tenantId: string,
    data: { url: string; events: string[]; name?: string; secret?: string },
  ) {
    try {
      const secret = data.secret || crypto.randomBytes(32).toString('hex')

      return await db.webhookEndpoint.create({
        data: {
          tenantId,
          name: data.name || 'Webhook Endpoint',
          url: data.url,
          events: JSON.stringify(data.events),
          secret,
          isActive: true,
        },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to register webhook endpoint: ${msg}`)
    }
  }

  async emit(tenantId: string, event: WebhookEventName, data: Record<string, unknown>) {
    try {
      const endpoints = await db.webhookEndpoint.findMany({
        where: {
          tenantId,
          isActive: true,
        },
      })

      const matching = endpoints.filter((ep) => {
        try {
          const events: string[] = JSON.parse(ep.events)
          return events.includes(event)
        } catch {
          return false
        }
      })

      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        tenantId,
        data,
      }

      const payloadStr = JSON.stringify(payload)

      await Promise.allSettled(
        matching.map((endpoint) => {
          return this.createAndDeliver(endpoint, payload, payloadStr, event)
        }),
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to emit webhook event: ${msg}`)
    }
  }

  private async createAndDeliver(
    endpoint: { id: string; secret: string; url: string },
    payload: WebhookPayload,
    payloadStr: string,
    event: string,
  ) {
    await db.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        event,
        payload: payloadStr,
        signature: crypto.createHmac('sha256', endpoint.secret).update(payloadStr).digest('hex'),
        status: 'PENDING',
        attempt: 1,
        maxAttempts: 3,
        nextRetryAt: new Date(),
      },
    })

    const delivery = await db.webhookDelivery.findFirst({
      where: { endpointId: endpoint.id, event },
      orderBy: { createdAt: 'desc' },
    })
    if (delivery) {
      await this.deliverWebhook(delivery, endpoint, payloadStr, event)
    }
  }

  private async deliverWebhook(
    delivery: { id: string; attempt: number; maxAttempts: number },
    endpoint: { secret: string; url: string },
    payloadStr: string,
    event: string,
  ) {
    try {
      const signature = crypto
        .createHmac('sha256', endpoint.secret)
        .update(payloadStr)
        .digest('hex')

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-Delivery': delivery.id,
        },
        body: payloadStr,
      })

      if (response.ok) {
        await db.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'SUCCESS',
            statusCode: response.status,
            completedAt: new Date(),
            attempt: delivery.attempt + 1,
          },
        })
      } else {
        const responseText = await response.text().catch(() => '')
        await this.handleFailure(delivery, endpoint, payloadStr, event, response.status, responseText)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error'
      await this.handleFailure(delivery, endpoint, payloadStr, event, 0, msg)
    }
  }

  private async handleFailure(
    delivery: { id: string; attempt: number; maxAttempts: number },
    endpoint: { secret: string; url: string },
    payloadStr: string,
    event: string,
    statusCode: number,
    error: string,
  ) {
    const newAttempt = delivery.attempt + 1

    if (newAttempt >= delivery.maxAttempts) {
      await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          attempt: newAttempt,
          statusCode,
          responseBody: error,
          completedAt: new Date(),
        },
      })
      return
    }

    const nextRetryAt = new Date(Date.now() + 5 * 60 * 1000 * Math.pow(3, newAttempt - 1))

    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'RETRYING',
        attempt: newAttempt,
        statusCode,
        responseBody: error,
        nextRetryAt,
      },
    })
  }

  async verifySignature(
    payload: string,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    try {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expected, 'hex'),
      )
    } catch {
      return false
    }
  }

  async listEndpoints(tenantId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit
      const [items, total] = await Promise.all([
        db.webhookEndpoint.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.webhookEndpoint.count({ where: { tenantId } }),
      ])

      return {
        items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to list webhook endpoints: ${msg}`)
    }
  }

  async deleteEndpoint(id: string, tenantId: string) {
    try {
      const endpoint = await db.webhookEndpoint.findFirst({ where: { id, tenantId } })
      if (!endpoint) throw new Error('Endpoint not found')
      return await db.webhookEndpoint.update({
        where: { id },
        data: { isActive: false },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to delete webhook endpoint: ${msg}`)
    }
  }

  async pingEndpoint(id: string, tenantId: string) {
    try {
      const endpoint = await db.webhookEndpoint.findFirst({
        where: { id, tenantId },
      })

      if (!endpoint) {
        throw new Error('Endpoint not found')
      }

      const payload = JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      })

      return {
        success: response.ok,
        statusCode: response.status,
        body: await response.text().catch(() => ''),
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to ping webhook endpoint: ${msg}`)
    }
  }
}

export const webhookManager = new WebhookManager()