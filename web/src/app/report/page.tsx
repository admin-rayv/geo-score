'use client'

import { useState } from 'react'
import Link from 'next/link'

interface PageResult {
  url: string
  success: boolean
  score: number
  categories: {
    machineReadability: number
    structuredData: number
    extractionFormat: number
    botAccessibility: number
  } | null
  recommendations: Array<{
    category: string
    priority: string
    action: string
  }>
}

interface PremiumReport {
  success: boolean
  reportType: string
  generatedAt: string
  analysisTime: string
  site: {
    url: string
    pagesAnalyzed: number
    pagesSuccessful: number
  }
  summary: {
    averageScore: number
    potentialScore: number
    lowestScore: number
    highestScore: number
  }
  pages: PageResult[]
  problemPages: PageResult[]
  actionPlan: {
    quickWins: Array<{ action: string; time: string; impact: number; category: string }>
    mediumProjects: Array<{ action: string; time: string; impact: number; category: string }>
  }
}

// Score badge component
function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const getColor = (s: number) => {
    if (s >= 75) return 'bg-amber-500 text-white'
    if (s >= 50) return 'bg-orange-400 text-white'
    return 'bg-red-500 text-white'
  }
  
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-20 h-20 text-2xl'
  }
  
  return (
    <div className={`${sizeClasses[size]} ${getColor(score)} rounded-xl flex items-center justify-center font-bold`}>
      {score}
    </div>
  )
}

// Progress bar
function ProgressBar({ value, max, color = 'amber' }: { value: number; max: number; color?: string }) {
  const percentage = (value / max) * 100
  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className={`h-full bg-${color}-500 rounded-full transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

// Page row component
function PageRow({ page, siteUrl }: { page: PageResult; siteUrl: string }) {
  const [expanded, setExpanded] = useState(false)
  const shortUrl = page.url.replace(siteUrl, '') || '/'
  
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div 
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <ScoreBadge score={page.score} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{shortUrl}</p>
          {page.categories && (
            <div className="flex gap-4 mt-1 text-xs text-gray-500">
              <span>🤖 {page.categories.machineReadability}/25</span>
              <span>📊 {page.categories.structuredData}/25</span>
              <span>📝 {page.categories.extractionFormat}/25</span>
              <span>🔓 {page.categories.botAccessibility}/25</span>
            </div>
          )}
        </div>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {expanded && page.recommendations.length > 0 && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-2">Recommandations:</p>
          <ul className="space-y-2">
            {page.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                  rec.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {rec.priority === 'high' ? 'Critique' : rec.priority === 'medium' ? 'Important' : 'Optionnel'}
                </span>
                <span className="text-gray-600">{rec.action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// Action item component
function ActionItem({ item, index }: { item: any; index: number }) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100">
      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
        {index + 1}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{item.action}</p>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {item.time}
          </span>
          <span className="flex items-center gap-1">
            Impact: {'★'.repeat(item.impact)}{'☆'.repeat(3 - item.impact)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function ReportPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<PremiumReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'actions'>('overview')

  const generateReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    
    setLoading(true)
    setError(null)
    setReport(null)
    
    try {
      const response = await fetch(`/api/premium?url=${encodeURIComponent(url)}`)
      const data = await response.json()
      
      if (data.success) {
        setReport(data)
      } else {
        setError(data.error || 'Une erreur est survenue')
      }
    } catch (err) {
      setError('Impossible de contacter le serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <span className="text-white font-bold text-xl">G</span>
              </div>
              <span className="text-xl font-bold text-gray-900">GEOScore</span>
            </Link>
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
              Rapport Premium
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Input Form */}
        {!report && (
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Rapport Premium GEO
            </h1>
            <p className="text-gray-600 mb-8">
              Analyse complète de toutes les pages de votre site avec recommandations détaillées
            </p>
            
            <form onSubmit={generateReport}>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://votre-site.com"
                  className="flex-1 px-5 py-4 rounded-xl border-2 border-gray-200 focus:border-amber-500 focus:ring-0 outline-none text-lg"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl disabled:opacity-50 shadow-lg shadow-amber-500/30"
                >
                  {loading ? 'Analyse en cours...' : 'Générer le rapport'}
                </button>
              </div>
            </form>
            
            {loading && (
              <div className="mt-8 p-6 bg-white rounded-xl border border-gray-100">
                <div className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-6 w-6 text-amber-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span className="text-gray-600">Analyse des pages en cours... Cela peut prendre jusqu'à 1 minute.</span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mt-8 p-6 bg-red-50 rounded-xl border border-red-200 text-red-600">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Report Results */}
        {report && (
          <div>
            {/* Summary Header */}
            <div className="bg-white rounded-2xl p-8 mb-8 border border-gray-100">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="text-center">
                  <ScoreBadge score={report.summary.averageScore} size="lg" />
                  <p className="mt-2 text-sm text-gray-500">Score moyen</p>
                </div>
                
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{report.site.url}</h2>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>📄 {report.site.pagesAnalyzed} pages analysées</span>
                    <span>⏱️ {report.analysisTime}</span>
                    <span>📅 {new Date(report.generatedAt).toLocaleDateString('fr-CA')}</span>
                  </div>
                  
                  <div className="mt-4 p-4 bg-amber-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Score potentiel après optimisation</span>
                      <span className="font-bold text-amber-600">{report.summary.potentialScore}/100</span>
                    </div>
                    <ProgressBar value={report.summary.potentialScore} max={100} />
                    <p className="mt-2 text-xs text-gray-500">
                      +{report.summary.potentialScore - report.summary.averageScore} points possibles avec nos recommandations
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {[
                { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
                { id: 'pages', label: 'Par page', icon: '📄' },
                { id: 'actions', label: 'Plan d\'action', icon: '🎯' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-5 py-3 rounded-xl font-medium transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Score Range */}
                <div className="bg-white rounded-xl p-6 border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4">Distribution des scores</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-500">{report.summary.lowestScore}</div>
                      <div className="text-xs text-gray-500">Plus bas</div>
                    </div>
                    <div className="flex-1 h-4 bg-gradient-to-r from-red-500 via-orange-400 to-amber-500 rounded-full relative">
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-800 rounded-full"
                        style={{ left: `${report.summary.averageScore}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-amber-500">{report.summary.highestScore}</div>
                      <div className="text-xs text-gray-500">Plus haut</div>
                    </div>
                  </div>
                </div>

                {/* Problem Pages */}
                {report.problemPages.length > 0 && (
                  <div className="bg-white rounded-xl p-6 border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-4">⚠️ Pages à corriger en priorité</h3>
                    <div className="space-y-3">
                      {report.problemPages.slice(0, 5).map((page, i) => (
                        <PageRow key={i} page={page} siteUrl={report.site.url} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
                    <div className="text-3xl font-bold text-amber-500">{report.site.pagesAnalyzed}</div>
                    <div className="text-sm text-gray-500">Pages analysées</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
                    <div className="text-3xl font-bold text-amber-500">{report.actionPlan.quickWins.length}</div>
                    <div className="text-sm text-gray-500">Quick Wins</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
                    <div className="text-3xl font-bold text-red-500">{report.problemPages.length}</div>
                    <div className="text-sm text-gray-500">Pages critiques</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
                    <div className="text-3xl font-bold text-amber-500">+{report.summary.potentialScore - report.summary.averageScore}</div>
                    <div className="text-sm text-gray-500">Points à gagner</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pages' && (
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Toutes les pages ({report.pages.length})</h3>
                <div className="space-y-3">
                  {report.pages.map((page, i) => (
                    <PageRow key={i} page={page} siteUrl={report.site.url} />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-6">
                {report.actionPlan.quickWins.length > 0 && (
                  <div className="bg-white rounded-xl p-6 border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      ⚡ Quick Wins <span className="text-sm font-normal text-gray-500">(5-15 min, fort impact)</span>
                    </h3>
                    <div className="space-y-3">
                      {report.actionPlan.quickWins.map((item, i) => (
                        <ActionItem key={i} item={item} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {report.actionPlan.mediumProjects.length > 0 && (
                  <div className="bg-white rounded-xl p-6 border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      🔧 Projets moyens <span className="text-sm font-normal text-gray-500">(30 min - 2h)</span>
                    </h3>
                    <div className="space-y-3">
                      {report.actionPlan.mediumProjects.map((item, i) => (
                        <ActionItem key={i} item={item} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-8 border border-amber-200 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Besoin d'aide pour implémenter?</h3>
                  <p className="text-gray-600 mb-4">
                    Le Guide GEO complet inclut des exemples de code prêts à copier-coller
                  </p>
                  <button className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30">
                    Obtenir le Guide GEO — 49,99$
                  </button>
                </div>
              </div>
            )}

            {/* Generate New Report */}
            <div className="mt-8 text-center">
              <button 
                onClick={() => setReport(null)}
                className="text-amber-600 font-medium hover:underline"
              >
                ← Analyser un autre site
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
