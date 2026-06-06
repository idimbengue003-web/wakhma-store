'use client'

import Link from 'next/link'
import { Store } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-auto bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 font-extrabold text-lg mb-3">
              <div className="w-8 h-8 bg-orange rounded-xl flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              <span className="text-white">Wakhma Store</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Les bonnes affaires à Dakar. Poste ce que tu cherches, les vendeurs te le trouvent rapidement.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold text-white mb-3">Navigation</h4>
            <div className="space-y-2">
              <Link href="/annonces" className="block text-sm text-gray-400 hover:text-orange transition-colors">
                Voir les annonces
              </Link>
              <Link href="/deposer" className="block text-sm text-gray-400 hover:text-orange transition-colors">
                Déposer une annonce
              </Link>
              <Link href="/recharge" className="block text-sm text-gray-400 hover:text-orange transition-colors">
                Recharger des points
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-3">Informations légales</h4>
            <div className="space-y-2">
              <Link href="/mentions-legales" className="block text-sm text-gray-400 hover:text-orange transition-colors">
                Mentions légales
              </Link>
              <Link href="/cgu" className="block text-sm text-gray-400 hover:text-orange transition-colors">
                Conditions générales d&apos;utilisation
              </Link>
              <Link href="/confidentialite" className="block text-sm text-gray-400 hover:text-orange transition-colors">
                Politique de confidentialité
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-3">Contact</h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              Dakar, Sénégal<br />
              WhatsApp disponible<br />
              contact@wakhmastore.com
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Wakhma Store. Tous droits réservés.
          </p>
          <div className="flex gap-4">
            <Link href="/mentions-legales" className="text-xs text-gray-500 hover:text-orange transition-colors">
              Mentions légales
            </Link>
            <Link href="/cgu" className="text-xs text-gray-500 hover:text-orange transition-colors">
              CGU
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
