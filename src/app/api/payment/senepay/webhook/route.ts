import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { autoMigrate } from '@/lib/migrate'
import { POINTS_TIERS, SUBSCRIPTION_TIERS } from '@/lib/constants'
import crypto from 'crypto'

// SenePay Webhook Handler
// Receives signed notifications when a payment is completed or failed
// HMAC-SHA256 signature verified for security
export async function POST(request: Request) {
  try {
    await autoMigrate()

    // Get raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get('x-senepay-signature')
    const eventType = request.headers.get('x-senepay-event')

    // Verify HMAC signature
    const webhookSecret = process.env.SENEPAY_WEBHOOK_SECRET
    if (webhookSecret && signature) {
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex')

      if (signature !== expected) {
        console.error('[SenePay] Webhook signature verification failed')
        return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
      }
    } else if (!webhookSecret) {
      console.warn('[SenePay] Webhook secret not configured - skipping signature verification')
    }

    const payload = JSON.parse(rawBody)

    console.log(`[SenePay] Webhook received: event=${payload.event}, orderRef=${payload.orderReference}, status=${payload.status}`)

    // Only process completed or failed events
    if (payload.event !== 'checkout.session.completed' && payload.event !== 'checkout.session.failed') {
      console.log(`[SenePay] Ignoring event: ${payload.event}`)
      return NextResponse.json({ received: true })
    }

    // Find the payment by orderReference
    const orderReference = payload.orderReference
    if (!orderReference) {
      console.error('[SenePay] Missing orderReference in webhook payload')
      return NextResponse.json({ error: 'orderReference manquant' }, { status: 400 })
    }

    const payment = await db.payment.findUnique({
      where: { orderReference },
    })

    if (!payment) {
      console.error(`[SenePay] Payment not found for orderRef: ${orderReference}`)
      return NextResponse.json({ error: 'Paiement non trouvé' }, { status: 404 })
    }

    // Idempotency check: already processed
    if (payment.status === 'completed') {
      console.log(`[SenePay] Payment ${orderReference} already completed - skipping`)
      return NextResponse.json({ received: true })
    }

    // Handle failed payment
    if (payload.event === 'checkout.session.failed' || payload.status === 'Failed') {
      await db.payment.update({
        where: { orderReference },
        data: {
          status: 'failed',
          providerTxId: payload.transactionId || null,
        },
      })
      console.log(`[SenePay] Payment ${orderReference} marked as failed`)
      return NextResponse.json({ received: true })
    }

    // Handle successful payment - verify amount matches
    const paidAmount = payload.amount || 0
    if (paidAmount !== payment.amount) {
      console.error(`[SenePay] Amount mismatch! Expected ${payment.amount}, got ${paidAmount}`)
      await db.payment.update({
        where: { orderReference },
        data: { status: 'failed' },
      })
      return NextResponse.json({ received: true })
    }

    // Credit the user based on payment type
    if (payment.type === 'points') {
      const idx = payment.tierIndex
      if (idx === null || idx < 0 || idx >= POINTS_TIERS.length) {
        console.error(`[SenePay] Invalid tierIndex ${idx} for payment ${orderReference}`)
        return NextResponse.json({ received: true })
      }

      const tier = POINTS_TIERS[idx]

      const user = await db.user.update({
        where: { id: payment.userId },
        data: { points: { increment: tier.points } },
      })

      // Mark payment as completed
      await db.payment.update({
        where: { orderReference },
        data: {
          status: 'completed',
          providerTxId: payload.transactionId || null,
          netAmount: payload.netAmount || null,
          fees: payload.fees || null,
          completedAt: new Date(),
        },
      })

      console.log(`[SenePay] Points credited: ${tier.points} pts for ${tier.prix} FCFA - Order: ${orderReference}`)
    } else if (payment.type === 'subscription') {
      const tier = SUBSCRIPTION_TIERS.find((t) => t.id === payment.tierId)
      if (!tier) {
        console.error(`[SenePay] Invalid tierId ${payment.tierId} for payment ${orderReference}`)
        return NextResponse.json({ received: true })
      }

      const now = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + tier.durationDays)

      const user = await db.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionTier: tier.id,
          subscriptionStart: now.toISOString(),
          subscriptionEnd: endDate.toISOString(),
          points: { increment: tier.bonusPoints },
        },
      })

      // Mark payment as completed
      await db.payment.update({
        where: { orderReference },
        data: {
          status: 'completed',
          providerTxId: payload.transactionId || null,
          netAmount: payload.netAmount || null,
          fees: payload.fees || null,
          completedAt: new Date(),
        },
      })

      console.log(`[SenePay] Subscription activated: ${tier.name} for ${tier.price} FCFA - Order: ${orderReference}`)
    }

    // Always respond 200 OK quickly
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[SenePay] Webhook processing error:', error)
    // Still return 200 to prevent SenePay retries for our internal errors
    return NextResponse.json({ received: true })
  }
}
