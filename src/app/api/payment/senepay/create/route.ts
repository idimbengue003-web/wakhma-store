import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { POINTS_TIERS, SUBSCRIPTION_TIERS } from '@/lib/constants'

// SenPay (Wave) payment creation
// Creates a payment request and returns a redirect URL to SenPay
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const body = await request.json()
    const { type, tierIndex, tierId } = body

    // Determine amount and label
    let amount = 0
    let label = ''

    if (type === 'points') {
      if (tierIndex < 0 || tierIndex >= POINTS_TIERS.length) {
        return NextResponse.json({ error: 'Pack invalide' }, { status: 400 })
      }
      const tier = POINTS_TIERS[tierIndex]
      amount = tier.prix
      label = `${tier.points} pts - ${tier.label}`
    } else if (type === 'subscription') {
      const tier = SUBSCRIPTION_TIERS.find((t) => t.id === tierId)
      if (!tier) {
        return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 })
      }
      amount = tier.price
      label = `Abonnement ${tier.name}`
    } else {
      return NextResponse.json({ error: 'Type de paiement invalide' }, { status: 400 })
    }

    // Generate a unique transaction ID
    const transactionId = `wave_${Date.now()}_${session.userId.slice(0, 8)}`

    // TODO: In production, call SenPay API to create a payment request:
    //
    // const response = await fetch('https://api.senepay.com/api/v1/payments', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.SENEPAY_API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     amount: amount,
    //     currency: 'XOF',
    //     transaction_id: transactionId,
    //     return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/senepay/callback`,
    //     cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/recharge`,
    //     custom_data: JSON.stringify({
    //       userId: session.userId,
    //       type,
    //       tierIndex,
    //       tierId,
    //     }),
    //   }),
    // })
    // const data = await response.json()
    // return NextResponse.json({ redirectUrl: data.payment_url })

    // For now (demo mode): simulate the SenPay redirect URL
    // In production, replace this with the actual SenPay payment URL from the API response
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://wakhmastore.com'
    const callbackUrl = `${baseUrl}/api/payment/senepay/callback?transaction_id=${transactionId}&status=success&userId=${session.userId}&type=${type}&tierIndex=${tierIndex}&tierId=${tierId}`

    console.log(`[SenPay/Wave] Payment created: ${label} - ${amount} FCFA for user ${session.userId}`)

    return NextResponse.json({
      success: true,
      transactionId,
      amount,
      label,
      // In demo mode, redirect directly to our callback (simulates instant payment)
      // In production, this would be the SenPay checkout URL
      redirectUrl: callbackUrl,
    })
  } catch (error) {
    console.error('SenPay create error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
