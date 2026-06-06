import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { execSync } from 'child_process'

export async function POST() {
  try {
    // Auto-push schema to create tables if they don't exist
    try {
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'pipe',
        timeout: 30000,
      })
    } catch (pushError) {
      console.error('Schema push warning:', pushError)
      // Continue anyway - tables might already exist
    }

    // Check if admin already exists
    const existing = await db.user.findUnique({ where: { phone: '770000000' } })
    if (existing) {
      return NextResponse.json({ message: 'Admin déjà créé', userId: existing.id })
    }

    const hashedPassword = hashPassword('wakhma2024')

    const admin = await db.user.create({
      data: {
        name: 'Admin Wakhma',
        phone: '770000000',
        password: hashedPassword,
        role: 'admin',
        points: 999999,
      },
    })

    // Create some demo demands
    const demoDemands = [
      {
        title: 'Je cherche un iPhone 14 Pro Max',
        description: 'En bon état, avec chargeur. Couleur noire préférée. Budget serré mais négociable.',
        category: 'Téléphones',
        budget: 350000,
        quartier: 'Plateau',
        urgency: 'flexible',
        whatsapp: '771234567',
        userId: admin.id,
      },
      {
        title: 'Je cherche un frigo Samsung double porte',
        description: 'Frigo Samsung ou LG double porte, pas trop vieux. Livraison si possible.',
        category: 'Frigo & Congélateur',
        budget: 200000,
        quartier: 'Médina',
        urgency: '1semaine',
        whatsapp: '772345678',
        userId: admin.id,
      },
      {
        title: 'Je cherche un climatiseur split 12000 BTU',
        description: 'Climatiseur split pour chambre. Installation incluse si possible. Urgent pour la chaleur !',
        category: 'Climatiseur & Ventilateur',
        budget: 150000,
        quartier: 'Almadies',
        urgency: 'urgent',
        whatsapp: '773456789',
        userId: admin.id,
      },
      {
        title: 'Je cherche un ordinateur portable pour études',
        description: 'PC portable correct pour études, 8Go RAM minimum. Pas pour gaming.',
        category: 'Ordinateurs',
        budget: 180000,
        quartier: 'Sicap Liberte',
        urgency: '2jours',
        whatsapp: '774567890',
        userId: admin.id,
      },
      {
        title: 'Je cherche un canapé 3 places',
        description: 'Canapé salon en cuir ou tissu, bonne qualité. Couleur claire.',
        category: 'Meubles',
        budget: 120000,
        quartier: 'Mermoz',
        urgency: 'flexible',
        whatsapp: '775678901',
        userId: admin.id,
      },
    ]

    for (const data of demoDemands) {
      await db.demand.create({ data })
    }

    return NextResponse.json({
      message: 'Base de données initialisée avec succès',
      adminId: admin.id,
      demoDemands: demoDemands.length,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'initialisation' }, { status: 500 })
  }
}

// Also handle GET for easy browser access
export async function GET() {
  return POST()
}
