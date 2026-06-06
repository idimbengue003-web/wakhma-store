import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

async function ensureTables() {
  // Create tables with raw SQL if they don't exist
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "phone" TEXT NOT NULL UNIQUE,
      "password" TEXT,
      "role" TEXT NOT NULL DEFAULT 'user',
      "userType" TEXT NOT NULL DEFAULT 'acheteur',
      "points" INTEGER NOT NULL DEFAULT 0,
      "subscriptionTier" TEXT,
      "subscriptionStart" TEXT,
      "subscriptionEnd" TEXT,
      "salesCount" INTEGER NOT NULL DEFAULT 0,
      "purchasesCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Demand" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'Autre',
      "budget" INTEGER NOT NULL DEFAULT 0,
      "price" INTEGER NOT NULL DEFAULT 0,
      "quartier" TEXT NOT NULL DEFAULT 'Dakar',
      "urgency" TEXT NOT NULL DEFAULT 'flexible',
      "photo" TEXT,
      "whatsapp" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "annonceType" TEXT NOT NULL DEFAULT 'cherche',
      "expiresAt" TIMESTAMP(3),
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Reveal" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "demandId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Add foreign keys only if they don't exist
  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Demand_userId_fkey'
      ) THEN
        ALTER TABLE "Demand" ADD CONSTRAINT "Demand_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
  `)

  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Reveal_userId_fkey'
      ) THEN
        ALTER TABLE "Reveal" ADD CONSTRAINT "Reveal_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
  `)

  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Reveal_demandId_fkey'
      ) THEN
        ALTER TABLE "Reveal" ADD CONSTRAINT "Reveal_demandId_fkey"
        FOREIGN KEY ("demandId") REFERENCES "Demand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
  `)

  // Add missing columns if tables already exist
  try { await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "userType" TEXT NOT NULL DEFAULT 'acheteur';`); } catch { /* already exists */ }
  try { await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "salesCount" INTEGER NOT NULL DEFAULT 0;`); } catch { /* already exists */ }
  try { await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "purchasesCount" INTEGER NOT NULL DEFAULT 0;`); } catch { /* already exists */ }
  try { await db.$executeRawUnsafe(`ALTER TABLE "Demand" ADD COLUMN IF NOT EXISTS "price" INTEGER NOT NULL DEFAULT 0;`); } catch { /* already exists */ }
  try { await db.$executeRawUnsafe(`ALTER TABLE "Demand" ADD COLUMN IF NOT EXISTS "annonceType" TEXT NOT NULL DEFAULT 'cherche';`); } catch { /* already exists */ }
  try { await db.$executeRawUnsafe(`ALTER TABLE "Demand" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);`); } catch { /* already exists */ }

  // Set expiresAt for existing active demands that don't have one (7 days from creation)
  await db.$executeRawUnsafe(`
    UPDATE "Demand"
    SET "expiresAt" = "createdAt" + INTERVAL '7 days'
    WHERE "expiresAt" IS NULL AND "status" = 'active';
  `)

  // Create indexes if they don't exist
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Demand_userId_idx" ON "Demand"("userId");`)
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Reveal_userId_idx" ON "Reveal"("userId");`)
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Reveal_demandId_idx" ON "Reveal"("demandId");`)
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Demand_expiresAt_idx" ON "Demand"("expiresAt");`)
}

export async function POST() {
  try {
    // Step 1: Create tables
    await ensureTables()

    // Step 2: Auto-expire annonces older than 7 days
    await db.$executeRawUnsafe(`
      UPDATE "Demand"
      SET "status" = 'expired'
      WHERE "status" = 'active'
      AND "expiresAt" IS NOT NULL
      AND "expiresAt" < CURRENT_TIMESTAMP;
    `)

    // Step 3: Check if admin already exists
    const existing = await db.user.findUnique({ where: { phone: '770000000' } })
    if (existing) {
      return NextResponse.json({ message: 'Admin déjà créé', userId: existing.id })
    }

    // Step 4: Create admin
    const hashedPassword = hashPassword('wakhma2024')

    const admin = await db.user.create({
      data: {
        name: 'Admin Wakhma',
        phone: '770000000',
        password: hashedPassword,
        role: 'admin',
        points: 999999,
        salesCount: 0,
        purchasesCount: 0,
      },
    })

    // Step 5: Create demo demands with expiresAt
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

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
        expiresAt: sevenDaysFromNow,
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
        expiresAt: sevenDaysFromNow,
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
        expiresAt: sevenDaysFromNow,
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
        expiresAt: sevenDaysFromNow,
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
        expiresAt: sevenDaysFromNow,
      },
    ]

    for (const data of demoDemands) {
      await db.demand.create({ data })
    }

    return NextResponse.json({
      message: 'Base de données initialisée avec succès !',
      adminId: admin.id,
      adminPhone: '770000000',
      adminPassword: 'wakhma2024',
      demoDemands: demoDemands.length,
    })
  } catch (error) {
    console.error('Seed error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Also handle GET for easy browser access
export async function GET() {
  return POST()
}
