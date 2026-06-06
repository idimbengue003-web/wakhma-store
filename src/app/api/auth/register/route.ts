import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, signToken } from '@/lib/auth'

// Auto-migrate: ensure all required columns exist in the User table
async function ensureUserColumns() {
  const columns = [
    { name: 'userType', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "userType" TEXT NOT NULL DEFAULT 'acheteur'` },
    { name: 'salesCount', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "salesCount" INTEGER NOT NULL DEFAULT 0` },
    { name: 'purchasesCount', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "purchasesCount" INTEGER NOT NULL DEFAULT 0` },
    { name: 'subscriptionTier', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionTier" TEXT` },
    { name: 'subscriptionStart', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStart" TEXT` },
    { name: 'subscriptionEnd', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionEnd" TEXT` },
  ]
  for (const col of columns) {
    try {
      await db.$executeRawUnsafe(col.sql)
    } catch {
      // Column already exists, ignore
    }
  }
}

export async function POST(request: Request) {
  try {
    // Auto-migrate first to ensure DB schema is in sync
    await ensureUserColumns()

    const body = await request.json()
    const { name, phone, password, userType } = body

    if (!name || !phone || !password) {
      return NextResponse.json(
        { error: 'Nom, téléphone et mot de passe requis' },
        { status: 400 }
      )
    }

    // Validate userType
    const validType = userType === 'vendeur' ? 'vendeur' : 'acheteur'

    // Validate Senegal phone - accept 70-79 (all Senegalese operators)
    const phoneClean = phone.replace(/[\s+]/g, '').replace(/^221/, '')
    if (!/^7[0-9]\d{7}$/.test(phoneClean)) {
      return NextResponse.json(
        { error: 'Numéro de téléphone invalide (format: 7X XXX XX XX)' },
        { status: 400 }
      )
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 4 caractères' },
        { status: 400 }
      )
    }

    // Check if phone already exists
    const existing = await db.user.findUnique({ where: { phone: phoneClean } })
    if (existing) {
      return NextResponse.json(
        { error: 'Ce numéro de téléphone est déjà utilisé' },
        { status: 400 }
      )
    }

    const hashedPassword = hashPassword(password)

    const user = await db.user.create({
      data: {
        name,
        phone: phoneClean,
        password: hashedPassword,
        role: 'user',
        userType: validType,
        points: 0,
        salesCount: 0,
        purchasesCount: 0,
      },
    })

    const token = signToken({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      name: user.name,
      subscriptionTier: user.subscriptionTier,
    })

    const response = NextResponse.json({
      user: {
        userId: user.id,
        phone: user.phone,
        role: user.role,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
        points: user.points,
        userType: user.userType,
        salesCount: user.salesCount,
        purchasesCount: user.purchasesCount,
      },
    })

    response.cookies.set('wakhma_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Register error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'inscription', detail: msg },
      { status: 500 }
    )
  }
}
