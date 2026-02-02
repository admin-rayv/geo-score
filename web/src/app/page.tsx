'use client'

import { useState } from 'react'

// Types
interface CategoryResult {
  score: number
  maxScore: number
  details: Record<string, any>
}

interface Recommendation {
  category: string
  priority: 'high' | 'medium' | 'low'
  issue: string
  action: string
}

interface AnalysisResult {
  success: boolean
  url: string
  score: number
  categories: {
    machineReadability: CategoryResult
    structuredData: CategoryResult
    extractionFormat: CategoryResult
    botAccessibility: CategoryResult
  }
  recommendations: Recommendation[]
  error?: string
}

// Score Gauge Component
function ScoreGauge({ score }: { score: number }) {
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const offset = circumference - progress
  
  const getColor = (s: number) => {
    if (s >= 75) return '#10B981' // green
    if (s >= 50) return '#F59E0B' // yellow
    return '#EF4444' // red
  }
  
  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-full h-full transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="#E5E7EB"
          strokeWidth="10"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke={getColor(score)}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-gauge"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl font-bold" style={{ color: getColor(score) }}>
            {score}
          </span>
          <span className="text-gray-400 text-lg">/100</span>
        </div>
      </div>
    </div>
  )
}

// Category Bar Component
function CategoryBar({ name, score, maxScore }: { name: string; score: number; maxScore: number }) {
  const percentage = (score / maxScore) * 100
  const getColor = (p: number) => {
    if (p >= 75) return 'bg-green-500'
    if (p >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }
  
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{name}</span>
        <span className="font-medium">{score}/{maxScore}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${getColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Recommendation Card Component
function RecommendationCard({ rec, index }: { rec: Recommendation; index: number }) {
  const priorityStyles = {
    high: 'border-red-200 bg-red-50',
    medium: 'border-yellow-200 bg-yellow-50',
    low: 'border-green-200 bg-green-50'
  }
  
  const priorityDot = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500'
  }
  
  return (
    <div className={`p-4 rounded-lg border ${priorityStyles[rec.priority]}`}>
      <div className="flex items-start gap-3">
        <div className={`w-6 h-6 rounded-full ${priorityDot[rec.priority]} text-white text-sm flex items-center justify-center font-bold shrink-0`}>
          {index + 1}
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{rec.category}</div>
          <p className="text-gray-800 font-medium">{rec.action}</p>
        </div>
      </div>
    </div>
  )
}

// Main Page Component
export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyzeUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const response = await fetch(`/api/analyze?url=${encodeURIComponent(url)}`)
      const data = await response.json()
      
      if (data.success) {
        setResult(data)
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
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-hero text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Votre site est-il prêt pour l'<span className="text-green-400">IA</span>?
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Analysez l'optimisation GEO de votre site web pour les moteurs de recherche IA 
            (ChatGPT, Gemini, Claude, Perplexity)
          </p>
          
          {/* URL Input Form */}
          <form onSubmit={analyzeUrl} className="max-w-xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://votre-site.com"
                className="flex-1 px-5 py-4 rounded-lg text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="px-8 py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 rounded-lg font-bold text-lg transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Analyse...
                  </span>
                ) : (
                  'Analyser'
                )}
              </button>
            </div>
          </form>
          
          <p className="text-gray-400 text-sm mt-4">
            ✨ Gratuit • Score instantané • 3 recommandations prioritaires
          </p>
        </div>
      </section>

      {/* Results Section */}
      {(result || error) && (
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-600 font-medium">❌ {error}</p>
              </div>
            ) : result && (
              <div className="space-y-8">
                {/* Score Card */}
                <div className="gradient-card rounded-2xl shadow-lg p-8 border">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Score GEO</h2>
                    <p className="text-gray-500">{result.url}</p>
                  </div>
                  
                  <ScoreGauge score={result.score} />
                  
                  <div className="mt-8 grid md:grid-cols-2 gap-6">
                    <div>
                      <CategoryBar 
                        name="🤖 Lisibilité Machine" 
                        score={result.categories.machineReadability.score} 
                        maxScore={25} 
                      />
                      <CategoryBar 
                        name="📊 Données Structurées" 
                        score={result.categories.structuredData.score} 
                        maxScore={25} 
                      />
                    </div>
                    <div>
                      <CategoryBar 
                        name="📝 Formatage Extraction" 
                        score={result.categories.extractionFormat.score} 
                        maxScore={25} 
                      />
                      <CategoryBar 
                        name="🔓 Accessibilité Bots" 
                        score={result.categories.botAccessibility.score} 
                        maxScore={25} 
                      />
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    🎯 Top 3 Recommandations
                  </h3>
                  <div className="space-y-3">
                    {result.recommendations.slice(0, 3).map((rec, i) => (
                      <RecommendationCard key={i} rec={rec} index={i} />
                    ))}
                  </div>
                </div>

                {/* CTA for full report */}
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 text-white text-center">
                  <h3 className="text-2xl font-bold mb-2">Vous voulez le rapport complet?</h3>
                  <p className="text-gray-300 mb-6">
                    Obtenez toutes les recommandations détaillées + checklist d'implémentation
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button className="px-8 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-bold transition-colors">
                      Rapport Complet — 29$
                    </button>
                    <button className="px-8 py-3 bg-white text-gray-800 hover:bg-gray-100 rounded-lg font-bold transition-colors">
                      Guide GEO PDF — 49,99$
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Features Section (shown when no results) */}
      {!result && !error && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
              Pourquoi le GEO est important?
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 rounded-xl bg-gray-50">
                <div className="text-3xl mb-3">🔍</div>
                <h3 className="text-xl font-bold mb-2">ChatGPT cite des sources</h3>
                <p className="text-gray-600">
                  Les moteurs IA recommandent des sites. Si votre contenu n'est pas optimisé, 
                  vous êtes invisible pour 100M+ d'utilisateurs.
                </p>
              </div>
              
              <div className="p-6 rounded-xl bg-gray-50">
                <div className="text-3xl mb-3">📈</div>
                <h3 className="text-xl font-bold mb-2">SEO ≠ GEO</h3>
                <p className="text-gray-600">
                  Les LLM ne lisent pas comme Google. Données structurées, FAQ, et lisibilité 
                  machine sont maintenant critiques.
                </p>
              </div>
              
              <div className="p-6 rounded-xl bg-gray-50">
                <div className="text-3xl mb-3">🤖</div>
                <h3 className="text-xl font-bold mb-2">Bots IA bloqués?</h3>
                <p className="text-gray-600">
                  Beaucoup de sites bloquent GPTBot ou ClaudeBot par erreur. 
                  Nous vérifions votre robots.txt.
                </p>
              </div>
              
              <div className="p-6 rounded-xl bg-gray-50">
                <div className="text-3xl mb-3">📋</div>
                <h3 className="text-xl font-bold mb-2">Recommandations actionnables</h3>
                <p className="text-gray-600">
                  Pas juste un score — des actions concrètes pour améliorer 
                  votre visibilité sur les moteurs IA.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center">
        <p>© 2026 GEOScore. Propulsé par RayV.</p>
      </footer>
    </main>
  )
}
