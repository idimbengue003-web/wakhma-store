'use client'

import { CATEGORY_EMOJIS, formatFCFA, getRevealPrice, timeAgo } from '@/lib/constants'
import { useAuthStore } from '@/lib/store'
import { Eye, MapPin, Clock, MessageCircle } from 'lucide-react'
import { useState } from 'react'

interface DemandCardProps {
  demand: {
    id: string
    title: string
    description: string
    category: string
    budget: number
    price: number
    quartier: string
    urgency: string
    photo?: string | null
    whatsapp: string
    whatsappRevealed: boolean
    createdAt: string
    userName: string
    userSubscriptionTier?: string | null
    userType?: string
    annonceType?: string
    hasPhoneInText: boolean
  }
  onReveal?: (demandId: string) => void
}

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: 'bg-red-100', text: 'text-red-700', label: '🔥 Urgent' },
  '2jours': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '⏳ 2 jours' },
  '1semaine': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '📅 1 semaine' },
  flexible: { bg: 'bg-green-100', text: 'text-green-700', label: '😊 Flexible' },
}

export function DemandCard({ demand, onReveal }: DemandCardProps) {
  const { user } = useAuthStore()
  const [revealing, setRevealing] = useState(false)
  const [revealed, setRevealed] = useState(demand.whatsappRevealed)
  const [whatsapp, setWhatsapp] = useState(demand.whatsappRevealed ? demand.whatsapp : '')

  const isVente = demand.annonceType === 'vends'
  const urgencyStyle = URGENCY_STYLES[demand.urgency] || URGENCY_STYLES.flexible
  const emoji = CATEGORY_EMOJIS[demand.category] || '📦'
  const revealPrice = user ? getRevealPrice(user.role, user.subscriptionTier) : 1000

  const handleReveal = async () => {
    if (!user) { window.location.href = '/login'; return }
    if (revealing) return
    setRevealing(true)
    try {
      const res = await fetch('/api/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demandId: demand.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setWhatsapp(data.whatsapp)
        setRevealed(true)
        if (onReveal) onReveal(demand.id)
      } else {
        alert(data.error || 'Erreur lors de la révélation')
      }
    } catch {
      alert('Erreur de connexion')
    } finally {
      setRevealing(false)
    }
  }

  const openWhatsApp = () => {
    if (whatsapp) {
      const cleaned = whatsapp.replace(/\s/g, '')
      window.open(`https://wa.me/221${cleaned}`, '_blank')
    }
  }

  // Badge based on subscription
  const subscriptionBadge = demand.userSubscriptionTier === 'king'
    ? '⭐ KING VIP'
    : demand.userSubscriptionTier === 'diambar'
      ? '💎 Diambar'
      : null

  return (
    <div className="annonce-card bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg">
      {/* Photo or emoji header */}
      {demand.photo ? (
        <div className="h-36 bg-gray-100 relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={demand.photo} alt={demand.title} className="w-full h-full object-cover" />
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 rounded-md text-[10px] font-semibold text-gray-700">
            {emoji} {demand.category}
          </span>
        </div>
      ) : (
        <div className={`h-24 flex items-center justify-center relative ${
          isVente ? 'bg-orange-bg' : 'bg-orange-bg'
        }`}>
          <span className="text-4xl">{emoji}</span>
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 rounded-md text-[10px] font-semibold text-gray-700">
            {demand.category}
          </span>
        </div>
      )}

      {/* "Je vends" badge + subscription badge */}
      {isVente && (
        <div className="flex items-center gap-1 px-3 pt-2">
          <span className="px-2 py-0.5 bg-orange text-white rounded-md text-[10px] font-bold">
            Je vends
          </span>
          {subscriptionBadge && (
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              demand.userSubscriptionTier === 'king'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-blue-50 text-blue-700'
            }`}>
              {subscriptionBadge}
            </span>
          )}
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Title & Urgency */}
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
            {demand.title}
          </h3>
          {!isVente && demand.urgency !== 'flexible' && (
            <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${urgencyStyle.bg} ${urgencyStyle.text}`}>
              {urgencyStyle.label}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-gray-600 line-clamp-2">{demand.description}</p>

        {/* Price (vends) or Budget (cherche) */}
        {isVente && demand.price > 0 ? (
          <div className="text-orange text-lg font-extrabold tracking-tight">
            {formatFCFA(demand.price)}
          </div>
        ) : demand.budget > 0 ? (
          <div className="text-orange text-lg font-extrabold tracking-tight">
            {formatFCFA(demand.budget)}
          </div>
        ) : null}

        {/* Location & Time */}
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <div className="flex items-center gap-0.5">
            <MapPin className="w-3 h-3" /> {demand.quartier}
          </div>
          <div className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" /> {timeAgo(new Date(demand.createdAt))}
          </div>
        </div>

        {/* User info */}
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <span>Par {demand.userName}</span>
          {demand.userSubscriptionTier === 'king' && <span>⭐</span>}
          {demand.userSubscriptionTier === 'diambar' && <span>💎</span>}
        </div>

        {/* Reveal / WhatsApp button */}
        {revealed ? (
          <button
            onClick={openWhatsApp}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xs"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Contacter sur WhatsApp
          </button>
        ) : (
          <button
            onClick={handleReveal}
            disabled={revealing}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-orange hover:bg-orange-dark text-white rounded-lg font-bold text-xs disabled:opacity-50"
          >
            <Eye className="w-3.5 h-3.5" />
            {revealing ? 'Chargement...' : `Voir le numéro (${revealPrice} pts)`}
          </button>
        )}
      </div>
    </div>
  )
}
