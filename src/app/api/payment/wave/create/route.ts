import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { POINTS_TIERS, SUBSCRIPTION_TIERS } from '@/lib/constants'
import { autoMigrate } from '@/lib/migrate'

// Wave payment creation
// Generates a Wave checkout URL that the user pays with their Wave app
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

    if (type === 'points') {
      if (tierIndex < 0 || tierIndex >= POINTS_TIERS.length) {
        return NextResponse.json({ error: 'Pack invalide' }, { status: 400 })
      }
      const tier = POINTS_TIERS[tierIndex]
      amount = tier.prix
      label = `${tier.points} pts - ${tier.label}`
    } else if (type === 'subscription') {
      const tier = SUBSCRIPTION_TIERS.find((t) => t.id === tierId)
      if (!tier) {
        return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 })
      }
      amount = tier.price
      label = `Abonnement ${tier.name}`
    } else {
      return NextResponse.json({ error: 'Type de paiement invalide' }, { status: 400 })
    }

    // Generate a unique transaction ID
    const transactionId = `wk_${Date.now()}_${session.userId.slice(0, 8)}`

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://wakhmastore.com'

    // ─── Wave Business API Integration ───
    // In production, use the Wave Business API to create a checkout session:
    //
    // POST https://api.wave.com/v1/checkout/sessions
    // Headers: Authorization: Bearer {WAVE_API_KEY}
    // Body: {
    //   amount: amount,
    //   currency: "XOF",
    //   error_url: `${baseUrl}/recharge?error=wave_failed`,
    //   success_url: `${baseUrl}/api/payment/wave/callback?tx=${transactionId}&userId=...`
    // }
    // Response: { id: "cos-xxx", checkout_url: "https://pay.wave.com/c/cos-xxx?a=1000&c=XOF&m=..." }

    // Wave checkout URL - use your business checkout ID
    const waveCheckoutId = process.env.WAVE_CHECKOUT_ID || 'cos-258qwgb281xqw'
    const waveMerchant = process.env.WAVE_MERCHANT_NAME || 'WakhmaStore'

    // Build the Wave payment URL
    const waveUrl = `https://pay.wave.com/c/${waveCheckoutId}?a=${amount}&c=XOF&m=${encodeURIComponent(waveMerchant)}`

    // Callback URL that Wave redirects to after payment
    const successUrl = `${baseUrl}/api/payment/wave/callback?tx=${transactionId}&status=success&userId=${session.userId}&type=${type}&tierIndex=${tierIndex}&tierId=${tierId}`

    console.log(`[Wave] Payment created: ${label} - ${amount} FCFA for user ${session.userId}`)

    return NextResponse.json({
      success: true,
      transactionId,
      amount,
      label,
      waveUrl,
      // In LIVE mode: redirect to Wave payment page (user pays in Wave app)
      // In DEMO mode: redirect directly to success callback (auto-confirms)
      redirectUrl: process.env.WAVE_LIVE_MODE === 'true' ? waveUrl : successUrl,
      isLive: process.env.WAVE_LIVE_MODE === 'true',
    })
  } catch (error) {
    console.error('Wave payment create error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Erreur serveur', detail: msg }, { status: 500 })
  }
}
