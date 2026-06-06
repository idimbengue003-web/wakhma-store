'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { CATEGORIES, QUARTIERS, URGENCY_OPTIONS, CATEGORY_EMOJIS, containsPhoneInText } from '@/lib/constants'
import { AlertTriangle, Camera, CheckCircle, ArrowLeft, X } from 'lucide-react'
import Link from 'next/link'

export default function DeposerPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Autre')
  const [budget, setBudget] = useState('')
  const [quartier, setQuartier] = useState('Dakar')
  const [urgency, setUrgency] = useState('flexible')
  const [whatsapp, setWhatsapp] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [phoneWarning, setPhoneWarning] = useState(false)

  const checkPhone = (text: string) => {
    setPhoneWarning(containsPhoneInText(text))
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhoto(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!user) {
      router.push('/login')
      return
    }

    setLoading(true)

    try {
      const budgetNum = budget ? parseInt(budget.replace(/\D/g, '')) : 0

      const res = await fetch('/api/demands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          budget: budgetNum,
          quartier,
          urgency,
          whatsapp,
          photo,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'Erreur lors de la création')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl shadow-lg border border-orange/20 p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Annonce publiée !</h2>
          <p className="text-gray-500 mb-6">
            Ton annonce est maintenant visible par tous les vendeurs de Dakar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/annonces"
              className="px-6 py-3 bg-orange hover:bg-orange-dark text-white rounded-xl font-medium text-sm transition-colors"
            >
              Voir les annonces
            </Link>
            <button
              onClick={() => {
                setSuccess(false)
                setTitle('')
                setDescription('')
                setBudget('')
                setWhatsapp('')
                setPhoto(null)
              }}
              className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Publier une autre
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-orange transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Déposer une annonce
        </h1>
        <p className="text-gray-500 mt-1">
          Décris ce que tu cherches, les vendeurs te contacteront
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {phoneWarning && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            Les numéros de téléphone détectés seront automatiquement masqués. Les vendeurs doivent utiliser la révélation pour les voir.
          </div>
        )}

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Catégorie *
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`p-2 rounded-xl text-xs font-medium transition-all text-center ${
                  category === cat
                    ? 'bg-orange-bg text-orange border-2 border-orange'
                    : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <span className="block text-lg mb-1">{CATEGORY_EMOJIS[cat] || '📦'}</span>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Je cherche... *
          </label>
          <div className="flex items-center">
            <span className="px-3 py-3 bg-orange-bg text-orange font-medium text-sm rounded-l-xl border border-r-0 border-gray-300">
              Je cherche
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="un iPhone 14, un frigo Samsung..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-r-xl focus:ring-2 focus:ring-orange focus:border-orange outline-none transition-all text-sm"
              required
            />
          </div>
        </div>

        {/* Urgency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Urgence
          </label>
          <div className="grid grid-cols-2 gap-2">
            {URGENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUrgency(opt.value)}
                className={`p-3 rounded-xl text-left transition-all ${
                  urgency === opt.value
                    ? 'bg-orange-bg border-2 border-orange'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                <div className="text-xs text-gray-500">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              checkPhone(e.target.value)
            }}
            placeholder="Décris ce que tu cherches en détail : marque, modèle, état, couleur..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange focus:border-orange outline-none transition-all text-sm resize-none"
            required
          />
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Budget (FCFA)
          </label>
          <input
            type="text"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Ex: 150000"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange focus:border-orange outline-none transition-all text-sm"
          />
        </div>

        {/* Quartier */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quartier
          </label>
          <select
            value={quartier}
            onChange={(e) => setQuartier(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange focus:border-orange outline-none transition-all text-sm bg-white"
          >
            <option value="Dakar">Dakar (tous)</option>
            {QUARTIERS.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro WhatsApp *
          </label>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="77 123 45 67"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange focus:border-orange outline-none transition-all text-sm"
            required
          />
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photo (optionnel)
          </label>
          {photo ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange hover:bg-orange-bg transition-all cursor-pointer">
              <Camera className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">Ajouter une photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Submit */}
        {!user ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 text-center">
            Vous devez être connecté pour déposer une annonce.{' '}
            <Link href="/login" className="font-semibold text-orange hover:underline">
              Se connecter
            </Link>
          </div>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-orange hover:bg-orange-dark text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 shadow-md"
          >
            {loading ? 'Publication...' : 'Publier mon annonce'}
          </button>
        )}
      </form>
    </div>
  )
}
