'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Zap, Crown, Star, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'

function SuccessContent() {
  const searchParams = useSearchParams()
  const { fetchUser } = useAuthStore()
  const [loaded, setLoaded] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'completed' | 'pending' | 'failed'>('loading')
  const [paymentInfo, setPaymentInfo] = useState<{
    type: string
    amount: number
    tierIndex: number | null
    tierId: string | null
  } | null>(null)

  const orderRef = searchParams.get('orderRef')

  useEffect(() => {
    // Refresh user data (points, subscription)
    fetchUser().then(() => setLoaded(true))

    // Check payment status via SenePay
    if (orderRef) {
      pollPaymentStatus(orderRef)
    } else {
      // Legacy support: direct params from old Wave callback
      setPaymentStatus('completed')
    }
  }, [orderRef, fetchUser])

  const pollPaymentStatus = async (ref: string) => {
    let attempts = 0
    const maxAttempts = 10

    const check = async (): Promise<boolean> => {
      try {
        const res = await fetch(`/api/payment/senepay/status?orderRef=${encodeURIComponent(ref)}`)
        if (!res.ok) return false

        const data = await res.json()
        setPaymentInfo({
          type: data.type,
          amount: data.amount,
          tierIndex: data.tierIndex,
          tierId: data.tierId,
        })

        if (data.status === 'completed') {
          setPaymentStatus('completed')
          // Refresh user data to reflect new points/subscription
          await fetchUser()
          return true
        } else if (data.status === 'failed') {
          setPaymentStatus('failed')
          return true
        }
        return false
      } catch {
        return false
      }
    }

    // First check immediately
    const done = await check()
    if (done) return

    // Poll every 3 seconds
    const interval = setInterval(async () => {
      attempts++
      const done = await check()
      if (done || attempts >= maxAttempts) {
        if (!done && attempts >= maxAttempts) {
          setPaymentStatus('pending')
        }
        clearInterval(interval)
      }
    }, 3000)
  }

  // Legacy support for old Wave params
  const type = searchParams.get('type') || paymentInfo?.type
  const added = searchParams.get('added')
  const balance = searchParams.get('balance')
  const tier = searchParams.get('tier') || paymentInfo?.tierId
  const bonus = searchParams.get('bonus')

  const isPoints = type === 'points'
  const isSubscription = type === 'subscription'

  if (paymentStatus === 'loading') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Vérification du paiement...</h2>
          <p className="text-sm text-gray-500">Nous confirmons votre paiement, merci de patienter.</p>
        </div>
      </div>
    )
  }

  if (paymentStatus === 'pending') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Loader2 className="w-10 h-10 text-yellow-600 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Paiement en cours de traitement</h2>
          <p className="text-sm text-gray-500 mb-6">
            Votre paiement est en cours de confirmation. Vous recevrez vos points dès que le paiement sera validé.
          </p>
          <Link
            href="/profil"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange hover:bg-orange-dark text-white rounded-xl font-bold text-sm"
          >
            Mon profil
          </Link>
        </div>
      </div>
    )
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Paiement échoué</h2>
          <p className="text-sm text-gray-500 mb-6">
            Le paiement n&apos;a pas pu être complété. Veuillez réessayer.
          </p>
          <Link
            href="/recharge"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange hover:bg-orange-dark text-white rounded-xl font-bold text-sm"
          >
            Réessayer
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        {/* Success animation */}
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-10 h-10 text-blue-800" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Paiement réussi !
        </h1>

        {isPoints && added && (
          <>
            <p className="text-gray-600 mb-1">
              <span className="text-3xl font-extrabold text-orange">{Number(added).toLocaleString('fr-FR')}</span>
              <span className="text-lg font-semibold text-gray-500 ml-1">points</span>
            </p>
            <p className="text-sm text-gray-500">
              Nouveau solde : <span className="font-bold text-orange">{Number(balance).toLocaleString('fr-FR')} pts</span>
            </p>
          </>
        )}

        {isSubscription && tier && (
          <>
            <div className="text-4xl mb-2">
              {tier === 'king' ? '⭐' : '💎'}
            </div>
            <p className="text-xl font-bold text-gray-900 mb-1">
              Abonnement {tier === 'king' ? 'VIP KING' : 'Diambar'} activé !
            </p>
            {bonus && (
              <p className="text-sm text-gray-500">
                <span className="font-bold text-orange">{Number(bonus).toLocaleString('fr-FR')} points</span> offerts
              </p>
            )}
            {balance && (
              <p className="text-sm text-gray-500 mt-1">
                Solde : <span className="font-bold">{Number(balance).toLocaleString('fr-FR')} pts</span>
              </p>
            )}
          </>
        )}

        {/* Generic success when no specific params */}
        {isPoints && !added && (
          <p className="text-gray-600 mb-2">
            Vos points ont été crédités sur votre compte.
          </p>
        )}

        {isSubscription && !tier && (
          <p className="text-gray-600 mb-2">
            Votre abonnement a été activé avec succès.
          </p>
        )}

        {!type && (
          <p className="text-gray-600 mb-2">
            Votre paiement a été traité avec succès.
          </p>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/deposer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange hover:bg-orange-dark text-white rounded-xl font-bold text-sm"
          >
            <Zap className="w-4 h-4" /> Déposer une annonce
          </Link>
          <Link
            href="/profil"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-xl font-medium text-sm text-gray-700 hover:bg-gray-50"
          >
            Mon profil
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-orange border-t-transparent rounded-full" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
