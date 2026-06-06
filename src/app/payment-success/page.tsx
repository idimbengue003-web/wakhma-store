'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Zap, Crown, Star } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { fetchUser } = useAuthStore()
  const [loaded, setLoaded] = useState(false)

  const type = searchParams.get('type')
  const added = searchParams.get('added')
  const balance = searchParams.get('balance')
  const tier = searchParams.get('tier')
  const bonus = searchParams.get('bonus')

  useEffect(() => {
    fetchUser().then(() => setLoaded(true))
  }, [fetchUser])

  const isPoints = type === 'points'
  const isSubscription = type === 'subscription'

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

        {isPoints && (
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

        {isSubscription && (
          <>
            <div className="text-4xl mb-2">
              {tier === 'king' ? '⭐' : '💎'}
            </div>
            <p className="text-xl font-bold text-gray-900 mb-1">
              Abonnement {tier === 'king' ? 'VIP KING' : 'Diambar'} activé !
            </p>
            <p className="text-sm text-gray-500">
              <span className="font-bold text-orange">{Number(bonus).toLocaleString('fr-FR')} points</span> offerts
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Solde : <span className="font-bold">{Number(balance).toLocaleString('fr-FR')} pts</span>
            </p>
          </>
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
