import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { POINTS_TIERS } from '@/lib/constants'

export async function POST(request: Request) {
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

    // Demo mode: instantly add points
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
