import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

// Orange Money OTP initiation
// In production, this calls the Orange Money API to send an OTP to the user's phone
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const body = await request.json()
    const { phone, type, tierIndex, tierId } = body

    if (!phone || phone.length < 9) {
      return NextResponse.json({ error: 'Numéro invalide' }, { status: 400 })
    }

    // Validate the payment amount
    if (type === 'points') {
      const { POINTS_TIERS } = await import('@/lib/constants')
      if (tierIndex < 0 || tierIndex >= POINTS_TIERS.length) {
        return NextResponse.json({ error: 'Pack invalide' }, { status: 400 })
      }
    } else if (type === 'subscription') {
      const { SUBSCRIPTION_TIERS } = await import('@/lib/constants')
      const tier = SUBSCRIPTION_TIERS.find((t) => t.id === tierId)
      if (!tier) {
        return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Type de paiement invalide' }, { status: 400 })
    }

    // TODO: In production, call Orange Money API here:
    // POST https://api.orange.com/omcoreapis/1.0.2/mp/init
    // with the phone number and amount
    // The API will send an OTP to the user's phone

    // For now: simulate OTP sent successfully
    console.log(`[Orange Money] OTP sent to +221${phone} for ${type} payment`)

    return NextResponse.json({
      success: true,
      message: 'OTP envoyé',
      transactionId: `om_${Date.now()}_${phone}`,
    })
  } catch (error) {
    console.error('Payment initiate error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
