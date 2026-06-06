import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { POINTS_TIERS, SUBSCRIPTION_TIERS } from '@/lib/constants'

// Orange Money OTP verification + credit points/subscription
// In production, this verifies the OTP with Orange Money API then credits the user
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const body = await request.json()
    const { phone, otp, type, tierIndex, tierId } = body

    if (!otp || otp.length < 4) {
      return NextResponse.json({ error: 'Code OTP invalide' }, { status: 400 })
    }

    // TODO: In production, verify OTP with Orange Money API:
    // POST https://api.orange.com/omcoreapis/1.0.2/mp/charge
    // with the OTP and transaction details
    // If successful, the payment is confirmed and money is deducted

    // For now: accept any 4+ digit OTP as valid (demo mode)
    // In production, remove this and use the Orange Money API response

    if (type === 'points') {
      // ─── Buy points ───
      if (tierIndex < 0 || tierIndex >= POINTS_TIERS.length) {
        return NextResponse.json({ error: 'Pack invalide' }, { status: 400 })
      }

      const tier = POINTS_TIERS[tierIndex]

      const user = await db.user.update({
        where: { id: session.userId },
        data: { points: { increment: tier.points } },
      })

      console.log(`[Orange Money] Points credited: ${tier.points} pts for ${tier.prix} FCFA from +221${phone}`)

      return NextResponse.json({
        success: true,
        pointsAdded: tier.points,
        newBalance: user.points,
        tier: tier.label,
      })
    } else if (type === 'subscription') {
      // ─── Activate subscription ───
      const tier = SUBSCRIPTION_TIERS.find((t) => t.id === tierId)
      if (!tier) {
        return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 })
      }

      const now = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + tier.durationDays)

      const user = await db.user.update({
        where: { id: session.userId },
        data: {
          subscriptionTier: tier.id,
          subscriptionStart: now.toISOString(),
          subscriptionEnd: endDate.toISOString(),
          role: tier.id === 'king' ? 'pro' : (session.role === 'admin' ? 'admin' : 'pro'),
          points: { increment: tier.bonusPoints },
        },
      })

      console.log(`[Orange Money] Subscription activated: ${tier.name} for ${tier.price} FCFA from +221${phone}`)

      return NextResponse.json({
        success: true,
        subscriptionTier: tier.id,
        bonusPoints: tier.bonusPoints,
        newBalance: user.points,
        endDate: endDate.toISOString(),
      })
    } else {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }
  } catch (error) {
    console.error('Payment verify error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
