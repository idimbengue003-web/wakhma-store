'use client'

import Link from 'next/link'
import { Search, ArrowRight, TrendingUp, Shield, Zap, MapPin, MessageCircle } from 'lucide-react'
import { CATEGORIES, CATEGORY_EMOJIS, formatFCFA, timeAgo } from '@/lib/constants'
import { useState, useEffect } from 'react'

// ─── Annonce type from API ───
interface Annonce {
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
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAnnonces() {
      try {
        const res = await fetch('/api/demands?limit=12')
        if (res.ok) {
          const data = await res.json()
          setAnnonces(data.demands.slice(0, 12))
        }
      } catch (error) {
        console.error('Erreur chargement annonces:', error)
      } finally {
        setLoading(false)
      }
    }
    loadAnnonces()
  }, [])

  const filteredAnnonces = searchQuery.trim()
    ? annonces.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.quartier.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : annonces

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── HERO SECTION ─── */}
      <section className="bg-gradient-to-br from-orange via-orange-dark to-orange-dark relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-80 h-80 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-yellow-300 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight tracking-tight">
              Wakhma Store
            </h1>
            <p className="text-white/90 text-lg sm:text-xl mb-8 font-medium">
              Les bonnes affaires à Dakar
            </p>

            {/* ─── HUGE SEARCH BAR ─── */}
            <div className="search-bar-shadow bg-white rounded-2xl p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto transition-shadow">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Que cherchez-vous ? Téléphone, frigo, voiture..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 text-gray-900 text-base placeholder-gray-400 rounded-xl focus:outline-none bg-gray-50 focus:bg-white transition-colors"
                />
              </div>
              <Link
                href={searchQuery ? `/annonces?search=${encodeURIComponent(searchQuery)}` : '/annonces'}
                className="px-8 py-3.5 bg-orange hover:bg-orange-dark text-white font-bold rounded-xl transition-colors text-base shrink-0 text-center"
              >
                Rechercher
              </Link>
            </div>

            {/* Quick category pills */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {['Téléphones', 'TV & Écrans', 'Ordinateurs', 'Meubles', 'Transport', 'Immobilier'].map(cat => (
                <Link
                  key={cat}
                  href={`/annonces?category=${encodeURIComponent(cat)}`}
                  className="px-3 py-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-medium rounded-full transition-colors border border-white/20"
                >
                  {CATEGORY_EMOJIS[cat]} {cat}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── ANNONCES GRID ─── */}
      <section className="flex-1 bg-gray-50 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Annonces récentes
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {loading ? 'Chargement...' : `${filteredAnnonces.length} annonce${filteredAnnonces.length > 1 ? 's' : ''} à Dakar`}
              </p>
            </div>
            <Link
              href="/annonces"
              className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-orange hover:text-orange-dark transition-colors"
            >
              Voir tout
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            /* Skeleton loading */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-7 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                    <div className="h-10 bg-gray-200 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAnnonces.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? `Aucune annonce trouvée pour "${searchQuery}"` : 'Aucune annonce pour le moment'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Essaie avec d\'autres mots-clés' : 'Sois le premier à poster une demande !'}
              </p>
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-orange font-semibold hover:text-orange-dark transition-colors"
                >
                  Effacer la recherche
                </button>
              ) : (
                <Link
                  href="/deposer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange hover:bg-orange-dark text-white rounded-xl font-bold text-sm transition-colors"
                >
                  Déposer une annonce
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {filteredAnnonces.map(annonce => (
                <AnnonceCard key={annonce.id} annonce={annonce} />
              ))}
            </div>
          )}

          {/* Mobile "Voir tout" */}
          <div className="sm:hidden mt-6 text-center">
            <Link
              href="/annonces"
              className="inline-flex items-center gap-1 text-sm font-semibold text-orange hover:text-orange-dark transition-colors"
            >
              Voir toutes les annonces
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES SECTION ─── */}
      <section className="bg-white py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
            Toutes les catégories
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2 sm:gap-3">
            {CATEGORIES.map(cat => (
              <Link
                key={cat}
                href={`/annonces?category=${encodeURIComponent(cat)}`}
                className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 hover:bg-orange-bg rounded-xl border border-gray-200 hover:border-orange/30 transition-all group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">
                  {CATEGORY_EMOJIS[cat] || '📦'}
                </span>
                <span className="text-[10px] sm:text-xs font-medium text-gray-600 group-hover:text-orange text-center leading-tight transition-colors">
                  {cat}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRUST SECTION ─── */}
      <section className="bg-orange-bg py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TrustCard
              icon={<Zap className="w-6 h-6" />}
              title="Rapide"
              description="Poste ta demande en 30 secondes et reçois des offres de vendeurs vérifiés en quelques minutes."
            />
            <TrustCard
              icon={<Shield className="w-6 h-6" />}
              title="Fiable"
              description="Vendeurs avec abonnement Diambar ou KING VIP. Annonces vérifiées et numéros de téléphone sécurisés."
            />
            <TrustCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Efficace"
              description="Passe directement par WhatsApp pour négocier. Pas d'intermédiaire, pas de frais cachés."
            />
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="bg-white py-10 sm:py-14">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Tu as quelque chose à vendre ?
          </h2>
          <p className="text-gray-600 mb-6 text-base">
            Dépose ton annonce gratuitement et des acheteurs te contacteront directement sur WhatsApp.
          </p>
          <Link
            href="/deposer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-orange hover:bg-orange-dark text-white rounded-2xl font-bold text-base transition-colors shadow-lg"
          >
            Déposer une annonce
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}

// ─── AnnonceCard (connecté aux vraies données) ───
function AnnonceCard({ annonce }: { annonce: Annonce }) {
  const emoji = CATEGORY_EMOJIS[annonce.category] || '📦'
  const contactUrl = `https://wa.me/221${annonce.whatsapp.replace(/\s/g, '')}`

  return (
    <div className="annonce-card bg-white rounded-2xl border border-gray-200 overflow-hidden group cursor-pointer">
      {/* Image or emoji */}
      {annonce.photo ? (
        <div className="relative h-48 sm:h-52 bg-gray-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={annonce.photo}
            alt={annonce.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-lg text-xs font-semibold text-gray-700 shadow-sm">
              {emoji} {annonce.category}
            </span>
          </div>
        </div>
      ) : (
        <div className="relative h-32 sm:h-36 bg-gradient-to-br from-orange-bg to-orange/10 flex items-center justify-center">
          <span className="text-5xl">{emoji}</span>
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-lg text-xs font-semibold text-gray-700 shadow-sm">
              {annonce.category}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-2.5">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-orange transition-colors">
          {annonce.title}
        </h3>

        {/* Price - ORANGE */}
        {annonce.budget > 0 && (
          <div className="text-orange text-2xl font-extrabold tracking-tight">
            {formatFCFA(annonce.budget)}
          </div>
        )}

        {/* Ville */}
        <div className="flex items-center gap-1 text-gray-500 text-xs">
          <MapPin className="w-3.5 h-3.5" />
          <span>{annonce.quartier}</span>
          <span className="text-gray-300 mx-1">•</span>
          <span>{timeAgo(new Date(annonce.createdAt))}</span>
        </div>

        {/* Contacter button = WhatsApp */}
        {annonce.whatsappRevealed ? (
          <a
            href={contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Contacter
          </a>
        ) : (
          <Link
            href={`/annonces`}
            className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 bg-orange hover:bg-orange-dark text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Voir l&apos;annonce
          </Link>
        )}
      </div>
    </div>
  )
}

function TrustCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-orange/10 shadow-sm">
      <div className="w-12 h-12 bg-orange/10 text-orange rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}
