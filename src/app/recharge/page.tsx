'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { SUBSCRIPTION_TIERS, POINTS_TIERS, formatFCFA } from '@/lib/constants'
import { CheckCircle, ArrowLeft, Zap, Crown, Star, X } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

type Tab = 'subscription' | 'points'

function RechargeContent() {
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('subscription')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState(searchParams.get('error') || '')

  // Wave loading state per item
  const [waveLoading, setWaveLoading] = useState<string | null>(null)

  // ─── Wave payment flow ───
  const handleWavePayment = async (type: 'points' | 'subscription', tierIndex: number, tierId: string) => {
    if (!user) {
      router.push('/login')
      return
    }
    const key = `${type}-${tierIndex}-${tierId}`
    setWaveLoading(key)
    setError('')
    try {
      const res = await fetch('/api/payment/wave/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, tierIndex, tierId }),
      })
      const data = await res.json()
      if (res.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else {
        setError(data.detail ? `${data.error} : ${data.detail}` : (data.error || 'Erreur lors du paiement Wave'))
        setWaveLoading(null)
      }
    } catch {
      setError('Erreur de connexion au serveur')
      setWaveLoading(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-orange mb-3">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Recharger & Abonnements
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Achète des points ou active un abonnement pour débloquer les numéros
        </p>
        {user && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-orange-bg border border-orange/20 rounded-lg">
            <Zap className="w-4 h-4 text-orange" />
            <span className="text-sm font-medium text-orange-dark">
              Solde : {user.points.toLocaleString('fr-FR')} pts
            </span>
            {user.subscriptionTier && (
              <span className="text-sm">
                {user.subscriptionTier === 'king' ? '⭐ VIP KING' : '💎 Diambar'}
              </span>
            )}
          </div>
        )}
      </div>

      {success && (
        <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" /> {success}
        </div>
      )}

      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span className="break-words">
            {error === 'paiement_annule' ? 'Paiement annulé' : error === 'callback_invalide' ? 'Callback invalide' : error === 'erreur_serveur' ? 'Erreur serveur, réessaie' : error}
          </span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 shrink-0 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('subscription')}
          className={`px-4 py-2 rounded-lg font-medium text-sm ${
            activeTab === 'subscription' ? 'bg-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ⭐ Abonnements
        </button>
        <button
          onClick={() => setActiveTab('points')}
          className={`px-4 py-2 rounded-lg font-medium text-sm ${
            activeTab === 'points' ? 'bg-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          💎 Recharger des points
        </button>
      </div>

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SUBSCRIPTION_TIERS.map((tier) => {
            const loadingKey = `subscription--1-${tier.id}`
            return (
              <div
                key={tier.id}
                className={`relative bg-white rounded-xl border-2 overflow-hidden ${
                  tier.id === 'king' ? 'border-yellow-400' : 'border-orange/30'
                }`}
              >
                {tier.id === 'king' && (
                  <div className="bg-yellow-400 text-white text-xs font-bold px-3 py-1 text-center">
                    POPULAIRE
                  </div>
                )}
                <div className="p-5">
                  <div className="text-3xl mb-1">{tier.badge}</div>
                  <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
                  <div className="mt-2 mb-3">
                    <span className="text-2xl font-extrabold text-gray-900">{formatFCFA(tier.price)}</span>
                    <span className="text-xs text-gray-500"> / {tier.durationDays} jours</span>
                  </div>
                  <ul className="space-y-1.5 mb-4">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                        <CheckCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${tier.id === 'king' ? 'text-yellow-500' : 'text-orange'}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Wave payment button */}
                  <button
                    onClick={() => handleWavePayment('subscription', -1, tier.id)}
                    disabled={waveLoading !== null}
                    className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${
                      tier.id === 'king'
                        ? 'bg-[#1DC7EA] hover:bg-[#1AB5D6] text-white'
                        : 'bg-[#1DC7EA] hover:bg-[#1AB5D6] text-white'
                    }`}
                  >
                    {waveLoading === loadingKey ? (
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                        </svg>
                        {tier.id === 'king' ? (
                          <><Crown className="w-4 h-4" /> Payer avec Wave</>
                        ) : (
                          <><Star className="w-4 h-4" /> Payer avec Wave</>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Points Tab */}
      {activeTab === 'points' && (
        <div className="grid grid-cols-2 gap-3">
          {POINTS_TIERS.map((tier, index) => {
            const loadingKey = `points-${index}-`
            return (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-4">
                <span className="text-xs font-medium text-gray-500">{tier.label}</span>
                <div className="mt-1">
                  <span className="text-xl font-bold text-gray-900">{tier.points.toLocaleString('fr-FR')}</span>
                  <span className="text-xs text-gray-500"> pts</span>
                </div>
                <div className="text-sm text-[#1DC7EA] font-semibold mb-3">{formatFCFA(tier.prix)}</div>

                <button
                  onClick={() => handleWavePayment('points', index, '')}
                  disabled={waveLoading !== null}
                  className="w-full py-2 bg-[#1DC7EA] hover:bg-[#1AB5D6] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {waveLoading === loadingKey ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                      </svg>
                      Payer Wave
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {!user && (
        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 text-center">
          Connecte-toi pour acheter des points.{' '}
          <Link href="/login" className="font-semibold text-orange">Se connecter</Link>
        </div>
      )}
    </div>
  )
}

export default function RechargePage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-orange border-t-transparent rounded-full mx-auto" />
      </div>
    }>
      <RechargeContent />
    </Suspense>
  )
}
