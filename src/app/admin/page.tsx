'use client'

import { useState, useEffect } from 'react'
import { formatFCFA, CATEGORY_EMOJIS } from '@/lib/constants'
import { Users, FileText, Eye, Shield, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface AdminUser {
  id: string
  name: string
  phone: string
  role: string
  points: number
  subscriptionTier: string | null
  createdAt: string
  _count: {
    demands: number
    reveals: number
  }
}

interface AdminDemand {
  id: string
  title: string
  description: string
  category: string
  budget: number
  quartier: string
  urgency: string
  status: string
  createdAt: string
  user: {
    name: string
    phone: string
  }
  reveals: unknown[]
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [demands, setDemands] = useState<AdminDemand[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'demands'>('overview')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [usersRes, demandsRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/demands'),
        ])
        if (cancelled) return
        if (usersRes.ok) {
          const data = await usersRes.json()
          setUsers(data.users)
        }
        if (demandsRes.ok) {
          const data = await demandsRes.json()
          setDemands(data.demands)
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const refreshData = async () => {
    setLoading(true)
    try {
      const [usersRes, demandsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/demands'),
      ])
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users)
      }
      if (demandsRes.ok) {
        const data = await demandsRes.json()
        setDemands(data.demands)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDemandStatus = async (demandId: string, status: string) => {
    try {
      const res = await fetch('/api/admin/demands', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demandId, status }),
      })
      if (res.ok) {
        refreshData()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSeed = async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      if (res.ok) {
        refreshData()
        alert('Base de données initialisée !')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const activeDemands = demands.filter((d) => d.status === 'active')
  const totalUsers = users.length
  const totalReveals = users.reduce((sum, u) => sum + u._count.reveals, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-red-500" />
            Administration
          </h1>
          <p className="text-gray-500 mt-1">Gérer la plateforme Wakh Ma Store</p>
        </div>
        <button
          onClick={handleSeed}
          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Initialiser les données démo
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['overview', 'users', 'demands'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab === 'overview' && "📊 Vue d'ensemble"}
            {tab === 'users' && `👥 Utilisateurs (${totalUsers})`}
            {tab === 'demands' && `📋 Annonces (${demands.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          {/* Overview */}
          {activeTab === 'overview' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <OverviewCard
                  icon={<Users className="w-6 h-6 text-blue-600" />}
                  label="Utilisateurs"
                  value={totalUsers.toString()}
                  bgColor="bg-blue-100"
                />
                <OverviewCard
                  icon={<FileText className="w-6 h-6 text-blue-600" />}
                  label="Annonces actives"
                  value={activeDemands.length.toString()}
                  bgColor="bg-blue-100"
                />
                <OverviewCard
                  icon={<Eye className="w-6 h-6 text-purple-600" />}
                  label="Révélations"
                  value={totalReveals.toString()}
                  bgColor="bg-purple-100"
                />
                <OverviewCard
                  icon={<Shield className="w-6 h-6 text-red-600" />}
                  label="Admins"
                  value={users.filter((u) => u.role === 'admin').length.toString()}
                  bgColor="bg-red-100"
                />
              </div>

              {/* Recent demands */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Dernières annonces</h3>
                </div>
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto custom-scrollbar">
                  {demands.slice(0, 10).map((demand) => (
                    <div key={demand.id} className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {CATEGORY_EMOJIS[demand.category] || '📦'} {demand.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          Par {demand.user.name} · {new Date(demand.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        demand.status === 'active' ? 'bg-blue-100 text-blue-700' :
                        demand.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {demand.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nom</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Téléphone</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rôle</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Points</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Abonnement</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Annonces</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Révélations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{u.phone}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            u.role === 'admin' ? 'bg-red-100 text-red-700' :
                            u.role === 'pro' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{u.points.toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-3 text-sm">
                          {u.subscriptionTier === 'king' ? '⭐ KING' : u.subscriptionTier === 'diambar' ? '💎 Diambar' : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{u._count.demands}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{u._count.reveals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Demands */}
          {activeTab === 'demands' && (
            <div className="space-y-3">
              {demands.map((demand) => (
                <div key={demand.id} className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{CATEGORY_EMOJIS[demand.category] || '📦'}</span>
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{demand.title}</h3>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                          demand.status === 'active' ? 'bg-blue-100 text-blue-700' :
                          demand.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {demand.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{demand.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>Par {demand.user.name}</span>
                        <span>{demand.quartier}</span>
                        {demand.budget > 0 && <span>{formatFCFA(demand.budget)}</span>}
                        <span>{demand.reveals.length} révélations</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {demand.status !== 'active' && (
                        <button
                          onClick={() => handleDemandStatus(demand.id, 'active')}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approuver
                        </button>
                      )}
                      {demand.status !== 'rejected' && (
                        <button
                          onClick={() => handleDemandStatus(demand.id, 'rejected')}
                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Rejeter
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OverviewCard({ icon, label, value, bgColor }: { icon: React.ReactNode; label: string; value: string; bgColor: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-5">
      <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
