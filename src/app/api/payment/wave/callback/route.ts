import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { autoMigrate } from '@/lib/migrate'
import { POINTS_TIERS, SUBSCRIPTION_TIERS } from '@/lib/constants'

// Wave payment callback
// Wave redirects here after the user completes (or cancels) payment
export async function GET(request: Request) {
  try {
    await autoMigrate()

    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('tx')
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') // 'points' or 'subscription'
    const tierIndex = searchParams.get('tierIndex')
    const tierId = searchParams.get('tierId')

    if (!transactionId || !userId) {
      return NextResponse.redirect(new URL('/recharge?error=callback_invalide', request.url))
    }

    // Payment cancelled or failed
    if (status !== 'success') {
      return NextResponse.redirect(new URL('/recharge?error=paiement_annule', request.url))
    }

    // TODO: In production, verify the payment with Wave Business API before crediting:
    //
    // GET https://api.wave.com/v1/checkout/sessions/{checkout_session_id}
    // Headers: Authorization: Bearer {WAVE_API_KEY}
    // Check: payment_status === "complete" && amount === expected_amount

    // Credit the user based on payment type
    if (type === 'points') {
      const idx = parseInt(tierIndex || '-1')
      if (idx < 0 || idx >= POINTS_TIERS.length) {
        return NextResponse.redirect(new URL('/recharge?error=pack_invalide', request.url))
      }

      const tier = POINTS_TIERS[idx]

      const user = await db.user.update({
        where: { id: userId },
        data: { points: { increment: tier.points } },
      })

      console.log(`[Wave] Points credited: ${tier.points} pts for ${tier.prix} FCFA - TX: ${transactionId}`)

      return NextResponse.redirect(
        new URL(`/payment-success?type=points&added=${tier.points}&balance=${user.points}`, request.url)
      )
    } else if (type === 'subscription') {
      const tier = SUBSCRIPTION_TIERS.find((t) => t.id === tierId)
      if (!tier) {
        return NextResponse.redirect(new URL('/recharge?error=abonnement_invalide', request.url))
      }

      const now = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + tier.durationDays)

      const user = await db.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: tier.id,
          subscriptionStart: now.toISOString(),
          subscriptionEnd: endDate.toISOString(),
          points: { increment: tier.bonusPoints },
        },
      })

      console.log(`[Wave] Subscription activated: ${tier.name} for ${tier.price} FCFA - TX: ${transactionId}`)

      return NextResponse.redirect(
        new URL(`/payment-success?type=subscription&tier=${tier.id}&bonus=${tier.bonusPoints}&balance=${user.points}`, request.url)
      )
    }

    return NextResponse.redirect(new URL('/recharge?error=type_invalide', request.url))
  } catch (error) {
    console.error('Wave callback error:', error)
    return NextResponse.redirect(new URL('/recharge?error=erreur_serveur', request.url))
  }
}
