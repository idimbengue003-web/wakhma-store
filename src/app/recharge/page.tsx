'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { SUBSCRIPTION_TIERS, POINTS_TIERS, formatFCFA } from '@/lib/constants'
import { CheckCircle, CreditCard, ArrowLeft, Zap, Crown, Star } from 'lucide-react'
import Link from 'next/link'

type Tab = 'subscription' | 'points'

export default function RechargePage() {
  const { user, fetchUser } = useAuthStore()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('subscription')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleBuyPoints = async (tierIndex: number) => {
    if (!user) {
      router.push('/login')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/points/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierIndex }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(`${data.pointsAdded.toLocaleString('fr-FR')} points ajoutés ! Solde: ${data.newBalance.toLocaleString('fr-FR')} pts`)
        await fetchUser()
      } else {
        setError(data.error || 'Erreur')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleActivateSubscription = async (tierId: string) => {
    if (!user) {
      router.push('/login')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/subscription/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(`Abonnement ${tierId === 'king' ? 'KING VIP ⭐' : 'Diambar 💎'} activé ! ${data.bonusPoints.toLocaleString('fr-FR')} points offerts`)
        await fetchUser()
      } else {
        setError(data.error || 'Erreur')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-orange transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Recharger & Abonnements
        </h1>
        <p className="text-gray-500 mt-1">
          Achète des points ou active un abonnement pour débloquer les numéros
        </p>
        {user && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-bg border border-orange/20 rounded-xl">
            <Zap className="w-4 h-4 text-orange" />
            <span className="text-sm font-medium text-orange-dark">
              Solde : {user.points.toLocaleString('fr-FR')} pts
            </span>
            {user.subscriptionTier && (
              <span className="text-sm">
                {user.subscriptionTier === 'king' ? '⭐ KING VIP' : '💎 Diambar'}
              </span>
            )}
          </div>
        )}
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" />
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab('subscription')}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'subscription'
              ? 'bg-orange text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ⭐ Abonnements
        </button>
        <button
          onClick={() => setActiveTab('points')}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'points'
              ? 'bg-orange text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          💎 Recharger des points
        </button>
      </div>

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SUBSCRIPTION_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative bg-white rounded-2xl shadow-lg border-2 overflow-hidden ${
                tier.id === 'king'
                  ? 'border-yellow-400 ring-2 ring-yellow-200'
                  : 'border-orange/30 ring-2 ring-orange/10'
              }`}
            >
              {tier.id === 'king' && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  POPULAIRE
                </div>
              )}
              <div className={`p-6 ${
                tier.id === 'king'
                  ? 'bg-gradient-to-br from-yellow-50 to-amber-50'
                  : 'bg-gradient-to-br from-orange-bg to-orange/5'
              }`}>
                <div className="text-4xl mb-2">{tier.badge}</div>
                <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-extrabold text-gray-900">{formatFCFA(tier.price)}</span>
                  <span className="text-sm text-gray-500"> / {tier.durationDays} jours</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                        tier.id === 'king' ? 'text-yellow-500' : 'text-orange'
                      }`} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleActivateSubscription(tier.id)}
                  disabled={loading}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 shadow-md ${
                    tier.id === 'king'
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
                      : 'bg-orange hover:bg-orange-dark text-white'
                  }`}
                >
                  {tier.id === 'king' ? (
                    <span className="flex items-center justify-center gap-2">
                      <Crown className="w-4 h-4" />
                      Devenir KING VIP
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Star className="w-4 h-4" />
                      Devenir Diambar
                    </span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Points Tab */}
      {activeTab === 'points' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {POINTS_TIERS.map((tier, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">{tier.label}</span>
                <CreditCard className="w-5 h-5 text-orange" />
              </div>
              <div className="mb-1">
                <span className="text-2xl font-bold text-gray-900">
                  {tier.points.toLocaleString('fr-FR')}
                </span>
                <span className="text-sm text-gray-500"> pts</span>
              </div>
              <div className="text-sm text-orange font-semibold mb-4">
                {formatFCFA(tier.prix)}
              </div>
              <button
                onClick={() => handleBuyPoints(index)}
                disabled={loading}
                className="w-full py-2.5 bg-orange hover:bg-orange-dark text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
              >
                Acheter
              </button>
            </div>
          ))}
        </div>
      )}

      {!user && (
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 text-center">
          Vous devez être connecté pour acheter des points ou activer un abonnement.{' '}
          <Link href="/login" className="font-semibold text-orange hover:underline">
            Se connecter
          </Link>
        </div>
      )}
    </div>
  )
}
