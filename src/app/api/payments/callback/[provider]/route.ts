import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Payment callback/webhook endpoint.
 * Receives callbacks from payment providers and updates payment status.
 * NOTE: Webhook signature validation is a placeholder — integrate with actual provider SDK.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params
    const body = await request.json()

    // TODO: Validate webhook signature based on provider
    // Each provider (e.g., flutterwave, MTN MoMo, Airtel Money) has its own signature mechanism
    const signature = request.headers.get('x-webhook-signature') || ''
    const isValidSignature = false // Placeholder — implement per-provider validation

    if (!isValidSignature && provider !== 'test') {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const { transactionRef, status, errorMessage, providerRef } = body as {
      transactionRef?: string
      status?: string
      errorMessage?: string
      providerRef?: string
    }

    if (!transactionRef || !status) {
      return NextResponse.json({ error: 'transactionRef and status are required' }, { status: 400 })
    }

    // Map provider status to internal status
    const statusMap: Record<string, string> = {
      successful: 'COMPLETED',
      completed: 'COMPLETED',
      success: 'COMPLETED',
      failed: 'FAILED',
      failure: 'FAILED',
      pending: 'PROCESSING',
      processing: 'PROCESSING',
    }

    const mappedStatus = statusMap[status.toLowerCase()] || 'PENDING'
    const updateData: Record<string, unknown> = { status: mappedStatus }

    if (mappedStatus === 'COMPLETED') {
      updateData.updatedAt = new Date()
    }
    if (mappedStatus === 'FAILED' && errorMessage) {
      updateData.description = errorMessage
    }

    // Find and update the payment
    const payment = await db.payment.findFirst({
      where: { transactionRef },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const updated = await db.payment.update({
      where: { id: payment.id },
      data: updateData,
    })

    // Trigger side effects based on payment type and status
    if (mappedStatus === 'COMPLETED') {
      // Side effects will be expanded in follow-up tasks
      // e.g., confirm VSLA savings, complete purchase, etc.
      console.log(`Payment ${payment.id} completed. Type: ${payment.type}`)
    }

    return NextResponse.json({ data: updated, provider, received: true })
  } catch (error) {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}