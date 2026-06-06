import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { SUBSCRIPTION_TIERS } from '@/lib/constants'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const body = await request.json()
    const { tierId } = body

    const tier = SUBSCRIPTION_TIERS.find((t) => t.id === tierId)
    if (!tier) {
      return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 })
    }

    // Calculate subscription dates
    const now = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + tier.durationDays)

    // Demo mode: instantly activate
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

    return NextResponse.json({
      success: true,
      subscriptionTier: tier.id,
      bonusPoints: tier.bonusPoints,
      newBalance: user.points,
      endDate: endDate.toISOString(),
    })
  } catch (error) {
    console.error('Subscription activate error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
