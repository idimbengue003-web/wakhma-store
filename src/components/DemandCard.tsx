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
    quartier: string
    urgency: string
    photo?: string | null
    whatsapp: string
    whatsappRevealed: boolean
    createdAt: string
    userName: string
    userSubscriptionTier?: string | null
    hasPhoneInText: boolean
  }
  onReveal?: (demandId: string) => void
}

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: 'bg-red-100', text: 'text-red-700', label: '🔥 Urgent' },
  '2jours': { bg: 'bg-orange-bg', text: 'text-orange-dark', label: '⏳ 2 jours' },
  '1semaine': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '📅 1 semaine' },
  flexible: { bg: 'bg-green-100', text: 'text-green-700', label: '😊 Flexible' },
}

export function DemandCard({ demand, onReveal }: DemandCardProps) {
  const { user } = useAuthStore()
  const [revealing, setRevealing] = useState(false)
  const [revealed, setRevealed] = useState(demand.whatsappRevealed)
  const [whatsapp, setWhatsapp] = useState(demand.whatsappRevealed ? demand.whatsapp : '')

  const urgencyStyle = URGENCY_STYLES[demand.urgency] || URGENCY_STYLES.flexible
  const emoji = CATEGORY_EMOJIS[demand.category] || '📦'
  const revealPrice = user ? getRevealPrice(user.role, user.subscriptionTier) : 1500

  const handleReveal = async () => {
    if (!user) {
      window.location.href = '/login'
      return
    }
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
      const url = `https://wa.me/221${cleaned}`
      window.open(url, '_blank')
    }
  }

  return (
    <div className="annonce-card bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg">
      {/* Photo or emoji header */}
      {demand.photo ? (
        <div className="h-40 bg-gray-100 relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={demand.photo}
            alt={demand.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-medium text-gray-700">
              {emoji} {demand.category}
            </span>
          </div>
        </div>
      ) : (
        <div className="h-28 bg-gradient-to-br from-orange-bg to-orange/10 flex items-center justify-center relative">
          <span className="text-5xl">{emoji}</span>
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-medium text-gray-700">
              {demand.category}
            </span>
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Title & Urgency */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
            {demand.title}
          </h3>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${urgencyStyle.bg} ${urgencyStyle.text}`}>
            {urgencyStyle.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2">
          {demand.description}
        </p>

        {/* Budget */}
        {demand.budget > 0 && (
          <div className="text-orange font-extrabold text-xl tracking-tight">
            {formatFCFA(demand.budget)}
          </div>
        )}

        {/* Location & Time */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {demand.quartier}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {timeAgo(new Date(demand.createdAt))}
          </div>
        </div>

        {/* User badge */}
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span>Par {demand.userName}</span>
          {demand.userSubscriptionTier === 'king' && <span>⭐</span>}
          {demand.userSubscriptionTier === 'diambar' && <span>💎</span>}
        </div>

        {/* Reveal / WhatsApp button */}
        {revealed ? (
          <button
            onClick={openWhatsApp}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Contacter sur WhatsApp
          </button>
        ) : (
          <button
            onClick={handleReveal}
            disabled={revealing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange hover:bg-orange-dark text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 shadow-sm"
          >
            <Eye className="w-4 h-4" />
            {revealing ? 'Chargement...' : `Voir le numéro (${revealPrice} pts)`}
          </button>
        )}
      </div>
    </div>
  )
}
