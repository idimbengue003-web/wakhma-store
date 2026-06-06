'use client'

import { MapPin, MessageCircle } from 'lucide-react'
import { CATEGORY_EMOJIS, formatFCFA } from '@/lib/constants'

interface Annonce {
  id: string
  title: string
  price: number
  image: string
  ville: string
  category: string
  whatsapp: string
  time: string
}

export function AnnonceCard({ annonce }: { annonce: Annonce }) {
  const emoji = CATEGORY_EMOJIS[annonce.category] || '📦'

  const contactUrl = `https://wa.me/221${annonce.whatsapp.replace(/\s/g, '')}`

  return (
    <div className="annonce-card bg-white rounded-2xl border border-gray-200 overflow-hidden group cursor-pointer">
      {/* Image */}
      <div className="relative h-48 sm:h-52 bg-gray-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={annonce.image}
          alt={annonce.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-lg text-xs font-semibold text-gray-700 shadow-sm">
            {emoji} {annonce.category}
          </span>
        </div>
        {/* Time */}
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-xs font-medium text-white">
            {annonce.time}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2.5">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-orange transition-colors">
          {annonce.title}
        </h3>

        {/* Price - ORANGE */}
        <div className="text-orange text-2xl font-extrabold tracking-tight">
          {formatFCFA(annonce.price)}
        </div>

        {/* Ville */}
        <div className="flex items-center gap-1 text-gray-500 text-xs">
          <MapPin className="w-3.5 h-3.5" />
          <span>{annonce.ville}</span>
        </div>

        {/* Contacter button = WhatsApp */}
        <a
          href={contactUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
        >
          <MessageCircle className="w-4 h-4" />
          Contacter
        </a>
      </div>
    </div>
  )
}
