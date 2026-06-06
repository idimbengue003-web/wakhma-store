'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { SUBSCRIPTION_TIERS, POINTS_TIERS, formatFCFA } from '@/lib/constants'
import { CheckCircle, ArrowLeft, Zap, Crown, Star, Phone } from 'lucide-react'
import Link from 'next/link'

type Tab = 'subscription' | 'points'

export default function RechargePage() {
  const { user, fetchUser } = useAuthStore()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('subscription')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Orange Money payment state
  const [paymentStep, setPaymentStep] = useState<'idle' | 'phone' | 'otp' | 'processing'>('idle')
  const [paymentType, setPaymentType] = useState<'points' | 'subscription' | null>(null)
  const [paymentTierIndex, setPaymentTierIndex] = useState<number>(-1)
  const [paymentTierId, setPaymentTierId] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)

  const startPayment = (type: 'points' | 'subscription', tierIndex: number, tierId: string) => {
    if (!user) {
      router.push('/login')
      return
    }
    setPaymentType(type)
    setPaymentTierIndex(tierIndex)
    setPaymentTierId(tierId)
    setPaymentStep('phone')
    setPhoneNumber('')
    setOtpCode('')
    setError('')
    setSuccess(null)
  }

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      setError('Numéro invalide. Ex: 771234567')
      return
    }
    setPaymentLoading(true)
    setError('')
    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          type: paymentType,
          tierIndex: paymentTierIndex,
          tierId: paymentTierId,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setPaymentStep('otp')
      } else {
        setError(data.error || 'Erreur lors de l\'envoi de l\'OTP')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length < 4) {
      setError('Code OTP invalide')
      return
    }
    setPaymentLoading(true)
    setError('')
    try {
      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          otp: otpCode,
          type: paymentType,
          tierIndex: paymentTierIndex,
          tierId: paymentTierId,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        if (paymentType === 'points') {
          setSuccess(`${data.pointsAdded?.toLocaleString('fr-FR') || ''} points ajoutés ! Solde: ${data.newBalance?.toLocaleString('fr-FR')} pts`)
        } else {
          setSuccess(`Abonnement activé ! ${data.bonusPoints?.toLocaleString('fr-FR') || ''} points offerts`)
        }
        setPaymentStep('idle')
        await fetchUser()
      } else {
        setError(data.error || 'Paiement échoué')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setPaymentLoading(false)
    }
  }

  const cancelPayment = () => {
    setPaymentStep('idle')
    setPhoneNumber('')
    setOtpCode('')
    setError('')
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
                {user.subscriptionTier === 'king' ? '⭐ KING VIP' : '💎 Diambar'}
              </span>
            )}
          </div>
        )}
      </div>

      {success && (
        <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" /> {success}
        </div>
      )}

      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ─── ORANGE MONEY PAYMENT MODAL ─── */}
      {paymentStep !== 'idle' && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange rounded-xl flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Payer avec Orange Money</h3>
                <p className="text-xs text-gray-500">
                  {paymentType === 'points'
                    ? `${POINTS_TIERS[paymentTierIndex]?.points.toLocaleString('fr-FR')} pts - ${formatFCFA(POINTS_TIERS[paymentTierIndex]?.prix || 0)}`
                    : `${SUBSCRIPTION_TIERS.find(t => t.id === paymentTierId)?.name} - ${formatFCFA(SUBSCRIPTION_TIERS.find(t => t.id === paymentTierId)?.price || 0)}`
                  }
                </p>
              </div>
            </div>

            {paymentStep === 'phone' && (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  Entre ton numéro Orange Money pour recevoir le code OTP :
                </p>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="771234567"
                  maxLength={9}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg font-mono text-center focus:ring-2 focus:ring-orange focus:border-orange outline-none"
                />
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={cancelPayment}
                    className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSendOTP}
                    disabled={paymentLoading || phoneNumber.length < 9}
                    className="flex-1 py-2.5 bg-orange hover:bg-orange-dark text-white rounded-xl font-bold text-sm disabled:opacity-50"
                  >
                    {paymentLoading ? 'Envoi...' : 'Envoyer OTP'}
                  </button>
                </div>
              </>
            )}

            {paymentStep === 'otp' && (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  Un code OTP a été envoyé au <span className="font-bold">{phoneNumber}</span>. Entre-le ci-dessous :
                </p>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg font-mono text-center tracking-widest focus:ring-2 focus:ring-orange focus:border-orange outline-none"
                  autoFocus
                />
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={cancelPayment}
                    className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleVerifyOTP}
                    disabled={paymentLoading || otpCode.length < 4}
                    className="flex-1 py-2.5 bg-orange hover:bg-orange-dark text-white rounded-xl font-bold text-sm disabled:opacity-50"
                  >
                    {paymentLoading ? 'Vérification...' : 'Confirmer'}
                  </button>
                </div>
                <button
                  onClick={handleSendOTP}
                  disabled={paymentLoading}
                  className="w-full mt-2 py-2 text-xs text-orange hover:text-orange-dark font-medium"
                >
                  Renvoyer le code OTP
                </button>
              </>
            )}

            {paymentStep === 'processing' && (
              <div className="text-center py-4">
                <div className="animate-spin w-8 h-8 border-2 border-orange border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm text-gray-600">Traitement en cours...</p>
              </div>
            )}
          </div>
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
          {SUBSCRIPTION_TIERS.map((tier) => (
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
                <button
                  onClick={() => startPayment('subscription', -1, tier.id)}
                  className={`w-full py-2.5 rounded-lg font-bold text-sm ${
                    tier.id === 'king'
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      : 'bg-orange hover:bg-orange-dark text-white'
                  }`}
                >
                  {tier.id === 'king' ? (
                    <span className="flex items-center justify-center gap-1.5"><Crown className="w-4 h-4" /> Devenir KING VIP</span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5"><Star className="w-4 h-4" /> Devenir Diambar</span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Points Tab */}
      {activeTab === 'points' && (
        <div className="grid grid-cols-2 gap-3">
          {POINTS_TIERS.map((tier, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-4">
              <span className="text-xs font-medium text-gray-500">{tier.label}</span>
              <div className="mt-1">
                <span className="text-xl font-bold text-gray-900">{tier.points.toLocaleString('fr-FR')}</span>
                <span className="text-xs text-gray-500"> pts</span>
              </div>
              <div className="text-sm text-orange font-semibold mb-3">{formatFCFA(tier.prix)}</div>
              <button
                onClick={() => startPayment('points', index, '')}
                className="w-full py-2 bg-orange hover:bg-orange-dark text-white rounded-lg font-bold text-xs"
              >
                Acheter
              </button>
            </div>
          ))}
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
