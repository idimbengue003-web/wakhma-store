'use client'

import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { Menu, X, Store, LogOut, User, Search } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const { user } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl shrink-0">
            <div className="w-9 h-9 bg-orange rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-orange">Wakhma Store</span>
          </Link>

          {/* Center: Categories link (desktop) */}
          <div className="hidden md:flex items-center gap-6 ml-8">
            <NavLink href="/annonces">Catégories</NavLink>
          </div>

          {/* Right: CTA + Auth */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/deposer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange hover:bg-orange-dark text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
            >
              Déposer une annonce
            </Link>
            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                  <div className="w-8 h-8 bg-orange-bg rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-orange" />
                  </div>
                  <span className="hidden lg:inline max-w-[100px] truncate">{user.name}</span>
                  {user.subscriptionTier === 'king' && <span className="text-xs">⭐</span>}
                  {user.subscriptionTier === 'diambar' && <span className="text-xs">💎</span>}
                </button>
                {/* Dropdown */}
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>
                  <Link href="/annonces" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Mes annonces</Link>
                  <Link href="/recharge" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Recharger</Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-orange hover:text-orange-dark border border-orange/30 hover:border-orange/50 rounded-xl transition-colors"
              >
                Se connecter
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            <MobileLink href="/annonces" onClick={() => setMobileOpen(false)}>
              <Search className="w-4 h-4 inline mr-2" />
              Catégories
            </MobileLink>
            <MobileLink href="/deposer" onClick={() => setMobileOpen(false)}>
              Déposer une annonce
            </MobileLink>
            {user ? (
              <>
                <MobileLink href="/annonces" onClick={() => setMobileOpen(false)}>Mes annonces</MobileLink>
                <MobileLink href="/recharge" onClick={() => setMobileOpen(false)}>Recharger</MobileLink>
                <MobileButton onClick={() => { handleLogout(); setMobileOpen(false) }}>
                  Déconnexion
                </MobileButton>
              </>
            ) : (
              <MobileLink href="/login" onClick={() => setMobileOpen(false)}>Se connecter</MobileLink>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-orange hover:bg-orange-bg rounded-lg transition-colors"
    >
      {children}
    </Link>
  )
}

function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-orange hover:bg-orange-bg rounded-lg transition-colors"
    >
      {children}
    </Link>
  )
}

function MobileButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
    >
      {children}
    </button>
  )
}
