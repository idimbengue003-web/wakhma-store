import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { autoMigrate } from '@/lib/migrate'
import { POINTS_TIERS, SUBSCRIPTION_TIERS } from '@/lib/constants'

// SenePay Checkout Session Creation
// Creates a checkout session and redirects user to SenePay hosted checkout page
// Falls back to DEMO mode if SenePay API keys are not configured
export async function POST(request: Request) {
  try {
    await autoMigrate()

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const body = await request.json()
    const { type, tierIndex, tierId } = body

    // Determine amount and label
    let amount = 0
    let label = ''
    let resolvedTierIndex: number | null = null
    let resolvedTierId: string | null = null

    if (type === 'points') {
      if (tierIndex < 0 || tierIndex >= POINTS_TIERS.length) {
        return NextResponse.json({ error: 'Pack invalide' }, { status: 400 })
      }
      const tier = POINTS_TIERS[tierIndex]
      amount = tier.prix
      label = `${tier.points} pts - ${tier.label}`
      resolvedTierIndex = tierIndex
    } else if (type === 'subscription') {
      const tier = SUBSCRIPTION_TIERS.find((t) => t.id === tierId)
      if (!tier) {
        return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 })
      }
      amount = tier.price
      label = `Abonnement ${tier.name}`
      resolvedTierId = tierId
    } else {
      return NextResponse.json({ error: 'Type de paiement invalide' }, { status: 400 })
    }

    // Generate unique order reference
    const orderReference = `WK-${Date.now()}-${session.userId.slice(0, 8)}`

    // Create a pending payment record in DB (for audit trail + idempotency)
    await db.payment.create({
      data: {
        userId: session.userId,
        type,
        amount,
        currency: 'XOF',
        status: 'pending',
        orderReference,
        tierIndex: resolvedTierIndex,
        tierId: resolvedTierId,
        provider: 'senepay',
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://wakhmastore.com'

    // ─── Check if SenePay API keys are configured ───
    const senepayApiKey = process.env.SENEPAY_API_KEY
    const senepayApiSecret = process.env.SENEPAY_API_SECRET

    if (!senepayApiKey || !senepayApiSecret) {
      // ═══ DEMO MODE ═══
      // When SenePay keys are not configured, auto-confirm the payment
      // This is for testing purposes only — remove in production
      console.log(`[SenePay DEMO] Auto-confirming payment: ${label} - ${amount} FCFA for user ${session.userId}`)

      // Credit the user immediately
      if (type === 'points' && resolvedTierIndex !== null) {
        const tier = POINTS_TIERS[resolvedTierIndex]
        const user = await db.user.update({
          where: { id: session.userId },
          data: { points: { increment: tier.points } },
        })

        await db.payment.update({
          where: { orderReference },
          data: { status: 'completed', completedAt: new Date() },
        })

        return NextResponse.json({
          success: true,
          orderReference,
          demoMode: true,
          redirectUrl: `${baseUrl}/payment-success?type=points&added=${tier.points}&balance=${user.points}`,
          amount,
          label,
        })
      } else if (type === 'subscription' && resolvedTierId) {
        const tier = SUBSCRIPTION_TIERS.find((t) => t.id === resolvedTierId)!
        const now = new Date()
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + tier.durationDays)

        const user = await db.user.update({
          where: { id: session.userId },
          data: {
            subscriptionTier: tier.id,
            subscriptionStart: now.toISOString(),
            subscriptionEnd: endDate.toISOString(),
            points: { increment: tier.bonusPoints },
          },
        })

        await db.payment.update({
          where: { orderReference },
          data: { status: 'completed', completedAt: new Date() },
        })

        return NextResponse.json({
          success: true,
          orderReference,
          demoMode: true,
          redirectUrl: `${baseUrl}/payment-success?type=subscription&tier=${tier.id}&bonus=${tier.bonusPoints}&balance=${user.points}`,
          amount,
          label,
        })
      }
    }

    // ═══ LIVE MODE — SenePay Checkout API ═══
    const checkoutPayload: Record<string, unknown> = {
      amount,
      currency: 'XOF',
      orderReference,
      description: `WakhmaStore - ${label}`,
      successUrl: `${baseUrl}/payment-success?orderRef=${orderReference}`,
      cancelUrl: `${baseUrl}/recharge?error=paiement_annule`,
      webhookUrl: `${baseUrl}/api/payment/senepay/webhook`,
      country: 'SN',
      expiresInMinutes: 30,
      metadata: {
        userId: session.userId,
        type,
        tierIndex: resolvedTierIndex?.toString() || '',
        tierId: resolvedTierId || '',
      },
    }

    console.log(`[SenePay] Creating checkout session: ${label} - ${amount} FCFA for user ${session.userId}`)

    const senepayResponse = await fetch('https://api.sene-pay.com/api/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': senepayApiKey!,
        'X-Api-Secret': senepayApiSecret!,
      },
      body: JSON.stringify(checkoutPayload),
    })

    const senepayData = await senepayResponse.json()

    if (!senepayResponse.ok) {
      console.error('[SenePay] Checkout creation failed:', JSON.stringify(senepayData))

      // Update payment status to failed
      await db.payment.update({
        where: { orderReference },
        data: { status: 'failed' },
      })

      // Return detailed error from SenePay so user knows what's wrong
      const detail = senepayData.message || senepayData.code || senepayData.error || ''
      const errorMsg = detail
        ? `SenePay: ${detail} (HTTP ${senepayResponse.status})`
        : `Erreur lors de la création du paiement (HTTP ${senepayResponse.status})`
      return NextResponse.json({ error: errorMsg, senepayDetail: senepayData }, { status: senepayResponse.status })
    }

    // Update payment with session token
    await db.payment.update({
      where: { orderReference },
      data: { sessionToken: senepayData.sessionToken },
    })

    console.log(`[SenePay] Session created: ${senepayData.sessionToken} -> ${senepayData.checkoutUrl}`)

    return NextResponse.json({
      success: true,
      orderReference,
      sessionToken: senepayData.sessionToken,
      checkoutUrl: senepayData.checkoutUrl,
      amount,
      label,
    })
  } catch (error) {
    console.error('[SenePay] Payment create error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Erreur serveur', detail: msg }, { status: 500 })
  }
}
