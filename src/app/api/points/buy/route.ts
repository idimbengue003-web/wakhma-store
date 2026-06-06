import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { POINTS_TIERS } from '@/lib/constants'

// DEPRECATED: This route is only for development/testing.
// In production, points are purchased through SenePay payment.
// This route is disabled in production to prevent free points exploitation.
export async function POST(request: Request) {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Cette route est désactivée en production. Utilisez le paiement SenePay.' }, { status: 403 })
  }

  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const body = await request.json()
    const { tierIndex } = body

    if (tierIndex === undefined || tierIndex < 0 || tierIndex >= POINTS_TIERS.length) {
      return NextResponse.json({ error: 'Tier invalide' }, { status: 400 })
    }

    const tier = POINTS_TIERS[tierIndex]

    const user = await db.user.update({
      where: { id: session.userId },
      data: { points: { increment: tier.points } },
    })

    return NextResponse.json({
      success: true,
      pointsAdded: tier.points,
      newBalance: user.points,
      tier: tier.label,
    })
  } catch (error) {
    console.error('Points buy error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
