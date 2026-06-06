'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { SUBSCRIPTION_TIERS, POINTS_TIERS, formatFCFA } from '@/lib/constants'
import { CheckCircle, ArrowLeft, Zap, Crown, Star, X, MessageCircle, Phone, Send, Camera, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

type Tab = 'subscription' | 'points'
type Step = 'select' | 'instructions' | 'form' | 'submitted'

// ─── Configuration ───
const STORE_PHONE = process.env.NEXT_PUBLIC_STORE_PHONE || '221771234567' // numéro WhatsApp du store avec indicatif

// Liens WhatsApp uniques pour chaque abonnement
const WHATSAPP_LINKS = {
  diambar: () => {
    const msg = encodeURIComponent(
      `🔔 *Nouvelle commande Wakhma Store*\n\n` +
      `💎 *Abonnement Diambar*\n` +
      `💰 Montant : 5 000 FCFA\n` +
      `⏱ Durée : 30 jours\n\n` +
      `Je souhaite acheter cet abonnement. Voici mon numéro Wave pour le paiement :`
    )
    return `https://wa.me/${STORE_PHONE}?text=${msg}`
  },
  king: () => {
    const msg = encodeURIComponent(
      `🔔 *Nouvelle commande Wakhma Store*\n\n` +
      `⭐ *Abonnement VIP KING*\n` +
      `💰 Montant : 10 000 FCFA\n` +
      `⏱ Durée : 30 jours\n\n` +
      `Je souhaite acheter cet abonnement. Voici mon numéro Wave pour le paiement :`
    )
    return `https://wa.me/${STORE_PHONE}?text=${msg}`
  },
  points: (tierLabel: string, prix: number, pts: number) => {
    const msg = encodeURIComponent(
      `🔔 *Nouvelle commande Wakhma Store*\n\n` +
      `💎 *Achat de points — Pack ${tierLabel}*\n` +
      `💰 Montant : ${new Intl.NumberFormat('fr-FR').format(prix)} FCFA\n` +
      `📦 Points : ${new Intl.NumberFormat('fr-FR').format(pts)} pts\n\n` +
      `Je souhaite acheter ce pack. Voici mon numéro Wave pour le paiement :`
    )
    return `https://wa.me/${STORE_PHONE}?text=${msg}`
  },
}

function RechargeContent() {
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('subscription')
  const [error, setError] = useState(searchParams.get('error') || '')

  // Form submission state (optional flow)
  const [showForm, setShowForm] = useState(false)
  const [step, setStep] = useState<Step>('select')
  const [selectedPayment, setSelectedPayment] = useState<{
    type: 'points' | 'subscription'
    tierIndex: number
    tierId: string
    amount: number
    label: string
  } | null>(null)

  const [senderPhone, setSenderPhone] = useState('')
  const [senderName, setSenderName] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [submittedData, setSubmittedData] = useState<{
    orderReference: string
    whatsappUrl: string
    amount: number
    label: string
  } | null>(null)

  // Start online proof submission flow
  const handleSelectPayment = (type: 'points' | 'subscription', tierIndex: number, tierId: string) => {
    if (!user) {
      router.push('/login')
      return
    }

    let amount = 0
    let label = ''

    if (type === 'points') {
      const tier = POINTS_TIERS[tierIndex]
      amount = tier.prix
      label = `${tier.points.toLocaleString('fr-FR')} pts - ${tier.label}`
    } else {
      const tier = SUBSCRIPTION_TIERS.find((t) => t.id === tierId)!
      amount = tier.price
      label = `Abonnement ${tier.name}`
    }

    setSelectedPayment({ type, tierIndex, tierId, amount, label })
    setStep('instructions')
    setError('')
  }

  // Submit payment proof
  const handleSubmitProof = async () => {
    if (!selectedPayment || !senderPhone.trim()) {
      setError('Le numéro de téléphone est obligatoire')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/payment/whatsapp/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedPayment.type,
          tierIndex: selectedPayment.tierIndex,
          tierId: selectedPayment.tierId,
          senderPhone: senderPhone.trim(),
          senderName: senderName.trim(),
          transactionId: transactionId.trim(),
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSubmittedData({
          orderReference: data.orderReference,
          whatsappUrl: data.whatsappUrl,
          amount: data.amount,
          label: data.label,
        })
        setStep('submitted')
      } else {
        setError(data.error || 'Erreur lors de la soumission')
      }
    } catch {
      setError('Erreur de connexion au serveur')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setStep('select')
    setSelectedPayment(null)
    setSenderPhone('')
    setSenderName('')
    setTransactionId('')
    setSubmittedData(null)
    setShowForm(false)
    setError('')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
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

      {/* Payment method banner */}
      <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-green-600 shrink-0" />
        <span>
          Paiement via <strong>Wave</strong> — Cliquez sur le bouton WhatsApp ci-dessous, envoyez l&apos;argent et votre commande sera validée rapidement !
        </span>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span className="break-words">{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 shrink-0 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ═══ STEP: SELECT — Choose tier with direct WhatsApp links ═══ */}
      {step === 'select' && (
        <>
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

          {/* ═══ Subscription Tab ═══ */}
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

                    {/* ─── BOUTON WHATSAPP UNIQUE ─── */}
                    <a
                      href={tier.id === 'diambar' ? WHATSAPP_LINKS.diambar() : WHATSAPP_LINKS.king()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      {tier.id === 'king' ? (
                        <><Crown className="w-4 h-4" /> Commander VIP KING</>
                      ) : (
                        <><Star className="w-4 h-4" /> Commander Diambar</>
                      )}
                    </a>

                    {/* Lien soumission en ligne (secondaire) */}
                    <button
                      onClick={() => handleSelectPayment('subscription', -1, tier.id)}
                      className="w-full mt-2 py-2 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Ou soumettre une preuve en ligne
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ Points Tab ═══ */}
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

                  {/* ─── BOUTON WHATSAPP UNIQUE ─── */}
                  <a
                    href={WHATSAPP_LINKS.points(tier.label, tier.prix, tier.points)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Commander via WhatsApp
                  </a>

                  {/* Lien soumission en ligne (secondaire) */}
                  <button
                    onClick={() => handleSelectPayment('points', index, '')}
                    className="w-full mt-2 py-1.5 border border-gray-300 text-gray-500 rounded-lg font-medium text-[10px] flex items-center justify-center gap-1 hover:bg-gray-50 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    Ou soumettre en ligne
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
        </>
      )}

      {/* ═══ STEP: INSTRUCTIONS — Wave payment instructions ═══ */}
      {step === 'instructions' && selectedPayment && (
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-blue-800 text-white p-5">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Instructions de paiement Wave
              </h2>
              <p className="text-blue-200 text-sm mt-1">Étape 1 sur 2 — Envoyez l&apos;argent via Wave</p>
            </div>

            {/* Amount & details */}
            <div className="p-5 border-b border-gray-100">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-500">Montant à envoyer</p>
                <p className="text-3xl font-extrabold text-blue-800">{formatFCFA(selectedPayment.amount)}</p>
                <p className="text-sm text-gray-500 mt-1">{selectedPayment.label}</p>
              </div>

              {/* Wave instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-blue-900 text-sm flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Envoyez via Wave à ce numéro :
                </h3>
                <div className="bg-white rounded-lg p-3 text-center border border-blue-200">
                  <p className="text-sm text-gray-500">Numéro Wave du store</p>
                  <p className="text-2xl font-bold text-blue-800 tracking-wide">{process.env.NEXT_PUBLIC_STORE_WAVE_NUMBER || '77 123 45 67'}</p>
                  <p className="text-xs text-gray-500 mt-1">Wakhma Store</p>
                </div>
                <div className="space-y-1.5 text-xs text-blue-800">
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">1.</span>
                    Ouvrez votre application <strong>Wave</strong>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">2.</span>
                    Envoyez <strong>{formatFCFA(selectedPayment.amount)}</strong> au numéro ci-dessus
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">3.</span>
                    Notez l&apos;<strong>ID de transaction</strong> après l&apos;envoi
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 space-y-3">
              <button
                onClick={() => setStep('form')}
                className="w-full py-3 bg-blue-800 hover:bg-blue-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                J&apos;ai envoyé l&apos;argent — Suivant
              </button>
              <button
                onClick={handleReset}
                className="w-full py-2.5 border border-gray-300 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP: FORM — Submit proof ═══ */}
      {step === 'form' && selectedPayment && (
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-green-600 text-white p-5">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Confirmez votre paiement
              </h2>
              <p className="text-green-200 text-sm mt-1">Étape 2 sur 2 — Soumettez votre preuve</p>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Amount recap */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-green-800">Montant envoyé :</span>
                <span className="font-bold text-green-800">{formatFCFA(selectedPayment.amount)}</span>
              </div>

              {/* Sender phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Votre numéro Wave <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="77 123 45 67"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Le numéro depuis lequel vous avez envoyé l&apos;argent</p>
              </div>

              {/* Sender name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Votre nom (optionnel)
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Amadou Diallo"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  ID de transaction Wave (optionnel)
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Ex: 8a7b6c5d4e3f..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Trouvez-le dans l&apos;historique de votre app Wave</p>
              </div>

              {/* Info box */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Votre paiement sera vérifié par un administrateur. Vous recevrez vos points/abonnement dès la validation (généralement en quelques minutes).
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 pt-0 space-y-3">
              <button
                onClick={handleSubmitProof}
                disabled={submitting || !senderPhone.trim()}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Soumettre la preuve de paiement
                  </>
                )}
              </button>
              <button
                onClick={() => setStep('instructions')}
                className="w-full py-2.5 border border-gray-300 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                ← Retour aux instructions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP: SUBMITTED — Confirmation + WhatsApp link ═══ */}
      {step === 'submitted' && submittedData && (
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Success header */}
            <div className="bg-blue-800 text-white p-5 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-lg font-bold">Preuve soumise avec succès !</h2>
              <p className="text-blue-200 text-sm mt-1">Référence : {submittedData.orderReference}</p>
            </div>

            {/* Details */}
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Montant :</span>
                  <span className="font-bold text-blue-800">{formatFCFA(submittedData.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Type :</span>
                  <span className="font-medium text-gray-900">{submittedData.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Statut :</span>
                  <span className="flex items-center gap-1 font-medium text-amber-600">
                    <Clock className="w-3.5 h-3.5" />
                    En attente de validation
                  </span>
                </div>
              </div>

              {/* WhatsApp CTA */}
              <a
                href={submittedData.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Confirmer via WhatsApp
              </a>
              <p className="text-xs text-center text-gray-500">
                Cliquez ci-dessus pour envoyer une confirmation automatique sur WhatsApp. Cela accélère la validation !
              </p>

              {/* What happens next */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">Que se passe-t-il ensuite ?</h4>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <p className="flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    Un administrateur vérifiera votre paiement
                  </p>
                  <p className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                    Dès validation, vos points/abonnement seront crédités automatiquement
                  </p>
                  <p className="flex items-start gap-2">
                    <MessageCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                    Vous pouvez accélérer en confirmant via WhatsApp
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 pt-0 space-y-3">
              <Link
                href="/annonces"
                className="w-full py-3 bg-blue-800 hover:bg-blue-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                Voir les annonces
              </Link>
              <button
                onClick={handleReset}
                className="w-full py-2.5 border border-gray-300 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                Faire un autre achat
              </button>
            </div>
          </div>
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
