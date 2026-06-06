import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { maskPhonesInText, containsPhoneInText, maskPhone } from '@/lib/constants'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam) : undefined

    const where: Record<string, unknown> = { status: 'active' }

    if (category && category !== 'Toutes') {
      where.category = category
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const demands = await db.demand.findMany({
      where,
      include: { user: true, reveals: true },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {}),
    })

    // Get session for masking logic
    const session = await getSession()

    const maskedDemands = demands.map((d) => {
      const isOwner = session?.userId === d.userId
      const hasRevealed = d.reveals.some((r) => r.userId === session?.userId)

      return {
        id: d.id,
        title: d.title,
        description: isOwner ? d.description : maskPhonesInText(d.description),
        category: d.category,
        budget: d.budget,
        quartier: d.quartier,
        urgency: d.urgency,
        photo: d.photo,
        whatsapp: isOwner || hasRevealed ? d.whatsapp : maskPhone(d.whatsapp),
        whatsappRevealed: isOwner || hasRevealed,
        status: d.status,
        createdAt: d.createdAt,
        userName: d.user.name,
        userSubscriptionTier: d.user.subscriptionTier,
        hasPhoneInText: containsPhoneInText(d.description),
      }
    })

    return NextResponse.json({ demands: maskedDemands })
  } catch (error) {
    console.error('Demands GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, category, budget, quartier, urgency, whatsapp, photo } = body

    if (!title || !description || !whatsapp) {
      return NextResponse.json(
        { error: 'Titre, description et WhatsApp requis' },
        { status: 400 }
      )
    }

    // Check for phone numbers in text
    if (containsPhoneInText(title) || containsPhoneInText(description)) {
      return NextResponse.json(
        { error: 'Les numéros de téléphone ne sont pas autorisés dans le titre ou la description. Ils seront masqués automatiquement.' },
        { status: 400 }
      )
    }

    // Check weekly limit (3 per week)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const weeklyCount = await db.demand.count({
      where: {
        userId: session.userId,
        createdAt: { gte: oneWeekAgo },
      },
    })

    if (weeklyCount >= 3) {
      return NextResponse.json(
        { error: 'Limite de 3 annonces par semaine atteinte. Passez en Diambar pour plus !' },
        { status: 400 }
      )
    }

    // Prefix title with "Je cherche"
    const fullTitle = title.startsWith('Je cherche') ? title : `Je cherche ${title}`

    const demand = await db.demand.create({
      data: {
        title: fullTitle,
        description,
        category: category || 'Autre',
        budget: budget || 0,
        quartier: quartier || 'Dakar',
        urgency: urgency || 'flexible',
        whatsapp: whatsapp.replace(/\s/g, ''),
        photo: photo || null,
        userId: session.userId,
      },
    })

    return NextResponse.json({ demand }, { status: 201 })
  } catch (error) {
    console.error('Demands POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
