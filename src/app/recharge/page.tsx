'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { SUBSCRIPTION_TIERS, POINTS_TIERS, formatFCFA } from '@/lib/constants'
import { CheckCircle, ArrowLeft, Zap, Crown, Star, Phone, X } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

type Tab = 'subscription' | 'points'
type PaymentMethod = 'orange' | 'wave'

function RechargeContent() {
  const searchParams = useSearchParams()
  const { user, fetchUser } = useAuthStore()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('subscription')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState(searchParams.get('error') || '')

  // Orange Money payment state
  const [omStep, setOmStep] = useState<'idle' | 'phone' | 'otp'>('idle')
  const [paymentType, setPaymentType] = useState<'points' | 'subscription' | null>(null)
  const [paymentTierIndex, setPaymentTierIndex] = useState<number>(-1)
  const [paymentTierId, setPaymentTierId] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)

  // Wave/SenPay loading state
  const [waveLoading, setWaveLoading] = useState<string | null>(null) // tier key being loaded

  // ─── Choose payment method modal ───
  const [choosingPayment, setChoosingPayment] = useState<{
    type: 'points' | 'subscription'
    tierIndex: number
    tierId: string
    label: string
    amount: number
  } | null>(null)

  const getPaymentInfo = (type: 'points' | 'subscription', tierIndex: number, tierId: string) => {
    if (type === 'points') {
      const tier = POINTS_TIERS[tierIndex]
      return { label: `${tier.points.toLocaleString('fr-FR')} pts`, amount: tier.prix }
    } else {
      const tier = SUBSCRIPTION_TIERS.find(t => t.id === tierId)
      return { label: tier?.name || '', amount: tier?.price || 0 }
    }
  }

  const handleChoosePayment = (type: 'points' | 'subscription', tierIndex: number, tierId: string) => {
    if (!user) {
      router.push('/login')
      return
    }
    const info = getPaymentInfo(type, tierIndex, tierId)
    setChoosingPayment({ type, tierIndex, tierId, label: info.label, amount: info.amount })
    setError('')
    setSuccess(null)
  }

  // ─── Orange Money flow ───
  const startOrangeMoney = () => {
    if (!choosingPayment) return
    setPaymentType(choosingPayment.type)
    setPaymentTierIndex(choosingPayment.tierIndex)
    setPaymentTierId(choosingPayment.tierId)
    setOmStep('phone')
    setPhoneNumber('')
    setOtpCode('')
    setChoosingPayment(null)
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
        setOmStep('otp')
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
        setOmStep('idle')
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

  const cancelOMPayment = () => {
    setOmStep('idle')
    setPhoneNumber('')
    setOtpCode('')
    setError('')
  }

  // ─── Wave/SenPay flow ───
  const handleWavePayment = async (type: 'points' | 'subscription', tierIndex: number, tierId: string) => {
    if (!user) {
      router.push('/login')
      return
    }
    const key = `${type}-${tierIndex}-${tierId}`
    setWaveLoading(key)
    setError('')
    setChoosingPayment(null)
    try {
      const res = await fetch('/api/payment/senepay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, tierIndex, tierId }),
      })
      const data = await res.json()
      if (res.ok && data.redirectUrl) {
        // Redirect to SenPay payment page
        window.location.href = data.redirectUrl
      } else {
        setError(data.error || 'Erreur lors de la création du paiement Wave')
        setWaveLoading(null)
      }
    } catch {
      setError('Erreur de connexion')
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
        <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" /> {success}
        </div>
      )}

      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{error === 'paiement_annule' ? 'Paiement annulé' : error === 'callback_invalide' ? 'Callback invalide' : error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── CHOOSE PAYMENT METHOD MODAL ─── */}
      {choosingPayment && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-fade-in">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Choisis le paiement</h3>
            <p className="text-sm text-gray-500 mb-4">
              {choosingPayment.label} — <span className="font-bold text-orange">{formatFCFA(choosingPayment.amount)}</span>
            </p>

            <div className="space-y-3">
              {/* Orange Money */}
              <button
                onClick={startOrangeMoney}
                className="w-full flex items-center gap-3 p-4 border-2 border-orange/30 hover:border-orange rounded-xl transition-colors text-left"
              >
                <div className="w-12 h-12 bg-orange rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">Orange Money</div>
                  <div className="text-[11px] text-gray-500">Paiement par code OTP</div>
                </div>
              </button>

              {/* Wave / SenPay */}
              <button
                onClick={() => handleWavePayment(choosingPayment.type, choosingPayment.tierIndex, choosingPayment.tierId)}
                disabled={waveLoading !== null}
                className="w-full flex items-center gap-3 p-4 border-2 border-blue-500/30 hover:border-blue-500 rounded-xl transition-colors text-left disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-[#1DC7EA] rounded-xl flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-sm">Wave</div>
                  <div className="text-[11px] text-gray-500">Redirection vers SenPay</div>
                </div>
                {waveLoading === `${choosingPayment.type}-${choosingPayment.tierIndex}-${choosingPayment.tierId}` && (
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                )}
              </button>
            </div>

            <button
              onClick={() => setChoosingPayment(null)}
              className="w-full mt-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ─── ORANGE MONEY OTP MODAL ─── */}
      {omStep !== 'idle' && (
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

            {omStep === 'phone' && (
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
                    onClick={cancelOMPayment}
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

            {omStep === 'otp' && (
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
                    onClick={cancelOMPayment}
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

                {/* Payment buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => handleChoosePayment('subscription', -1, tier.id)}
                    className={`w-full py-2.5 rounded-lg font-bold text-sm ${
                      tier.id === 'king'
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        : 'bg-orange hover:bg-orange-dark text-white'
                    }`}
                  >
                    {tier.id === 'king' ? (
                      <span className="flex items-center justify-center gap-1.5"><Crown className="w-4 h-4" /> Devenir VIP KING</span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5"><Star className="w-4 h-4" /> Devenir Diambar</span>
                    )}
                  </button>
                </div>
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

              {/* Payment buttons */}
              <div className="space-y-1.5">
                <button
                  onClick={() => handleChoosePayment('points', index, '')}
                  disabled={waveLoading === `points-${index}-`}
                  className="w-full py-2 bg-orange hover:bg-orange-dark text-white rounded-lg font-bold text-xs disabled:opacity-50"
                >
                  Acheter
                </button>
              </div>
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
