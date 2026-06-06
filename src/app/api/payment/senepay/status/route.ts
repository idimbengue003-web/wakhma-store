import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { autoMigrate } from '@/lib/migrate'

// Check payment status by orderReference
// Used by the payment-success page to verify payment and get details
export async function GET(request: Request) {
  try {
    await autoMigrate()

    const { searchParams } = new URL(request.url)
    const orderRef = searchParams.get('orderRef')

    if (!orderRef) {
      return NextResponse.json({ error: 'orderRef requis' }, { status: 400 })
    }

    const payment = await db.payment.findUnique({
      where: { orderReference: orderRef },
      select: {
        orderReference: true,
        status: true,
        type: true,
        amount: true,
        tierIndex: true,
        tierId: true,
        providerTxId: true,
        sessionToken: true,
        netAmount: true,
        fees: true,
        createdAt: true,
        completedAt: true,
        userId: true,
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Paiement non trouvé' }, { status: 404 })
    }

    // If payment is still pending, check with SenePay API
    if (payment.status === 'pending' && payment.sessionToken) {
      const senepayApiKey = process.env.SENEPAY_API_KEY
      const senepayApiSecret = process.env.SENEPAY_API_SECRET

      if (senepayApiKey && senepayApiSecret) {
        try {
          const statusResponse = await fetch(
            `https://api.sene-pay.com/api/v1/checkout/sessions/${payment.sessionToken}`,
            {
              headers: {
                'X-Api-Key': senepayApiKey,
                'X-Api-Secret': senepayApiSecret,
              },
            }
          )

          if (statusResponse.ok) {
            const statusData = await statusResponse.json()

            if (statusData.status === 'Complete') {
              // Trigger the webhook processing logic by calling it internally
              // The webhook should have already handled this, but as a fallback
              console.log(`[SenePay] Status check: payment ${orderRef} is Complete on SenePay side`)
              return NextResponse.json({
                ...payment,
                status: 'completed',
                providerNote: 'Paiement confirmé côté SenePay - crédit en cours',
              })
            } else if (statusData.status === 'Failed' || statusData.status === 'Cancelled' || statusData.status === 'Expired') {
              await db.payment.update({
                where: { orderReference: orderRef },
                data: { status: statusData.status.toLowerCase() },
              })
              return NextResponse.json({ ...payment, status: statusData.status.toLowerCase() })
            }
          }
        } catch (err) {
          console.error('[SenePay] Status check failed:', err)
        }
      }
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error('[SenePay] Status check error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
