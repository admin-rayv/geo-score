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

// Score Circle Component
function ScoreCircle({ score }: { score: number }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const offset = circumference - progress
  
  const getColor = (s: number) => {
    if (s >= 70) return '#22c55e' // green
    if (s >= 50) return '#f59e0b' // amber
    if (s >= 30) return '#fb923c' // orange
    return '#ef4444' // red
  }
  
  const getLabel = (s: number) => {
    if (s >= 70) return { text: 'Good', color: 'text-green-600', bg: 'bg-green-100' }
    if (s >= 50) return { text: 'Average', color: 'text-amber-600', bg: 'bg-amber-100' }
    if (s >= 30) return { text: 'Poor', color: 'text-orange-600', bg: 'bg-orange-100' }
    return { text: 'Critical', color: 'text-red-600', bg: 'bg-red-100' }
  }
  
  const label = getLabel(score)
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="88"
            cy="88"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="12"
            fill="none"
          />
          <circle
            cx="88"
            cy="88"
            r={radius}
            stroke={getColor(score)}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="score-gauge"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-gray-900">{score}</span>
          <span className="text-gray-500 text-sm">/100</span>
        </div>
      </div>
      <span className={`mt-4 px-4 py-1.5 rounded-full text-sm font-semibold ${label.bg} ${label.color}`}>
        {label.text}
      </span>
    </div>
  )
}

// Category Bar
function CategoryBar({ icon, name, score, maxScore, color }: { 
  icon: string; name: string; score: number; maxScore: number; color: string 
}) {
  const safeScore = isNaN(score) || score === undefined || score === null ? 0 : score
  const percentage = (safeScore / maxScore) * 100
  
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-2xl`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between mb-2">
          <span className="font-medium text-gray-900">{name}</span>
          <span className="font-bold text-gray-900">{safeScore}/{maxScore}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${
              percentage >= 70 ? 'bg-green-500' : percentage >= 50 ? 'bg-amber-500' : percentage >= 30 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// Recommendation Card
function RecommendationCard({ rec, index }: { rec: Recommendation; index: number }) {
  const config = {
    high: { border: 'border-l-red-500', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700' },
    medium: { border: 'border-l-orange-500', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
    low: { border: 'border-l-amber-500', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700' }
  }[rec.priority]
  
  return (
    <div className={`${config.bg} ${config.border} border-l-4 rounded-r-xl p-5`}>
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center font-bold text-gray-700">
          {index + 1}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-gray-500">{rec.category}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badge}`}>
              {rec.priority === 'high' ? 'Critical' : rec.priority === 'medium' ? 'Important' : 'Optional'}
            </span>
          </div>
          <p className="text-gray-900 font-medium">{rec.action}</p>
        </div>
      </div>
    </div>
  )
}

// Main Page
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
        setError(data.error || 'An error occurred')
      }
    } catch (err) {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <span className="text-white font-bold text-xl">G</span>
              </div>
              <span className="text-xl font-bold text-gray-900">CheckGEO</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#how" className="text-gray-600 hover:text-amber-600 transition-colors font-medium">How it works</a>
              <a href="#pricing" className="text-gray-600 hover:text-amber-600 transition-colors font-medium">Pricing</a>
              <a href="/report" className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors">
                Premium Report
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-gradient relative overflow-hidden">
        {/* Background SVG illustration */}
        <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" style={{ minHeight: '100%' }}>
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 0.7 }} />
              <stop offset="100%" style={{ stopColor: '#fb923c', stopOpacity: 0.4 }} />
            </linearGradient>
          </defs>
          
          {/* Network lines */}
          <g stroke="url(#lineGrad)" strokeWidth="2" fill="none">
            <path d="M100,200 Q300,100 500,180" opacity="0.6"/>
            <path d="M500,180 Q700,250 900,150" opacity="0.5"/>
            <path d="M900,150 Q1050,200 1150,100" opacity="0.4"/>
            <path d="M200,400 Q400,350 600,420" opacity="0.5"/>
            <path d="M600,420 Q800,480 1000,380" opacity="0.4"/>
            <path d="M50,600 Q250,550 450,620" opacity="0.5"/>
            <path d="M450,620 Q650,680 850,580" opacity="0.4"/>
            <path d="M850,580 Q1000,520 1150,600" opacity="0.3"/>
            <path d="M100,200 Q200,300 200,400" opacity="0.4"/>
            <path d="M500,180 Q550,300 600,420" opacity="0.5"/>
            <path d="M900,150 Q950,260 1000,380" opacity="0.4"/>
            <path d="M200,400 Q300,510 450,620" opacity="0.4"/>
            <path d="M600,420 Q700,500 850,580" opacity="0.4"/>
          </g>
          
          {/* Large nodes */}
          <circle cx="100" cy="200" r="12" fill="#f59e0b" opacity="0.9"/>
          <circle cx="100" cy="200" r="5" fill="#ffffff"/>
          <circle cx="500" cy="180" r="16" fill="#f59e0b" opacity="1"/>
          <circle cx="500" cy="180" r="7" fill="#ffffff"/>
          <circle cx="900" cy="150" r="10" fill="#fb923c" opacity="0.85"/>
          <circle cx="900" cy="150" r="4" fill="#ffffff"/>
          <circle cx="600" cy="420" r="18" fill="#f59e0b" opacity="0.9"/>
          <circle cx="600" cy="420" r="8" fill="#ffffff"/>
          <circle cx="850" cy="580" r="12" fill="#fb923c" opacity="0.85"/>
          <circle cx="850" cy="580" r="5" fill="#ffffff"/>
          
          {/* Medium nodes */}
          <circle cx="200" cy="400" r="8" fill="#fbbf24" opacity="0.7"/>
          <circle cx="200" cy="400" r="3" fill="#ffffff"/>
          <circle cx="1000" cy="380" r="10" fill="#f59e0b" opacity="0.5"/>
          <circle cx="1000" cy="380" r="4" fill="#ffffff"/>
          <circle cx="450" cy="620" r="10" fill="#fbbf24" opacity="0.6"/>
          <circle cx="450" cy="620" r="4" fill="#ffffff"/>
          <circle cx="1150" cy="100" r="8" fill="#fbbf24" opacity="0.5"/>
          <circle cx="1150" cy="100" r="3" fill="#ffffff"/>
          <circle cx="1150" cy="600" r="9" fill="#f59e0b" opacity="0.4"/>
          <circle cx="1150" cy="600" r="4" fill="#ffffff"/>
          <circle cx="50" cy="600" r="7" fill="#fb923c" opacity="0.5"/>
          <circle cx="50" cy="600" r="3" fill="#ffffff"/>
          
          {/* Small decorative nodes */}
          <g fill="#f59e0b">
            <circle cx="300" cy="100" r="4" opacity="0.5"/>
            <circle cx="750" cy="120" r="5" opacity="0.4"/>
            <circle cx="350" cy="350" r="4" opacity="0.4"/>
            <circle cx="780" cy="350" r="5" opacity="0.4"/>
            <circle cx="150" cy="500" r="4" opacity="0.5"/>
            <circle cx="400" cy="250" r="3" opacity="0.4"/>
            <circle cx="700" cy="300" r="4" opacity="0.4"/>
            <circle cx="950" cy="480" r="3" opacity="0.4"/>
            <circle cx="550" cy="550" r="4" opacity="0.4"/>
            <circle cx="250" cy="650" r="3" opacity="0.4"/>
          </g>
          
          {/* Pulse rings */}
          <circle cx="500" cy="180" r="28" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.2"/>
          <circle cx="500" cy="180" r="45" fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.1"/>
          <circle cx="600" cy="420" r="32" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.15"/>
        </svg>
        
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-md mb-8">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-sm font-medium text-gray-700">Free instant analysis</span>
            </div>
            
            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
              Is your site visible to{' '}
              <span className="gradient-text">ChatGPT</span>?
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Test your GEO optimization and discover how AI search engines 
              (ChatGPT, Claude, Gemini, Perplexity) see your website.
            </p>
            
            {/* URL Input */}
            <form onSubmit={analyzeUrl} className="max-w-xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-site.com"
                    className="w-full pl-12 pr-4 py-4 rounded-xl input-modern text-lg"
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="btn-primary px-8 py-4 rounded-xl text-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Analyzing...
                    </span>
                  ) : (
                    'Analyze my site'
                  )}
                </button>
              </div>
            </form>
            
            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Free
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No signup
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Results in 10 sec
              </span>
            </div>
          </div>
        </div>
        
      </section>

      {/* Results Section */}
      {(result || error) && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-6">
            {error ? (
              <div className="card rounded-2xl p-8 text-center border-red-200 bg-red-50">
                <div className="text-5xl mb-4">😕</div>
                <p className="text-red-600 text-lg font-medium">{error}</p>
                <p className="text-red-500 mt-2">Please check the URL and try again.</p>
              </div>
            ) : result && (
              <div className="space-y-8">
                {/* Score Card */}
                <div className="card rounded-3xl p-8 md:p-10">
                  <div className="flex flex-col lg:flex-row items-center gap-10">
                    <ScoreCircle score={result.score} />
                    
                    <div className="flex-1 w-full">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">Detailed Analysis</h2>
                      <div className="space-y-3">
                        <CategoryBar icon="🤖" name="Machine Readability" score={result.categories?.machineReadability?.score ?? 0} maxScore={25} color="bg-amber-100" />
                        <CategoryBar icon="📊" name="Structured Data" score={result.categories?.structuredData?.score ?? 0} maxScore={25} color="bg-orange-100" />
                        <CategoryBar icon="📝" name="Extraction Format" score={result.categories?.extractionFormat?.score ?? 0} maxScore={25} color="bg-yellow-100" />
                        <CategoryBar icon="🔓" name="AI Bot Access" score={result.categories?.botAccessibility?.score ?? 0} maxScore={25} color="bg-rose-100" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <span className="text-gray-500">Site analyzed: </span>
                    <span className="font-medium text-gray-900">{result.url}</span>
                  </div>
                </div>

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                      🎯 Top 3 Actions
                    </h3>
                    <div className="space-y-4">
                      {result.recommendations.slice(0, 3).map((rec, i) => (
                        <RecommendationCard key={i} rec={rec} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Upsell */}
                <div className="card rounded-3xl p-8 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Want the full picture?</h3>
                      <p className="text-gray-600 mb-4">
                        Get the complete report with all recommendations, code examples, 
                        and an implementation checklist.
                      </p>
                      <ul className="space-y-2">
                        {['All detailed recommendations', 'Copy-paste JSON-LD examples', 'Printable PDF checklist'].map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-gray-700">
                            <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-col gap-3 shrink-0">
                      <a href="/report" className="btn-primary px-8 py-4 rounded-xl text-lg text-center">
                        Full Report — $29
                      </a>
                      <button className="btn-secondary px-8 py-4 rounded-xl text-lg">
                        GEO Guide PDF — $49.99
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* How it works Section */}
      {!result && !error && (
        <section id="how" className="py-24 bg-gradient-to-b from-white to-amber-50/50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold mb-4">
                Why it matters
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                <span className="gradient-text">GEO</span> is the new SEO
              </h2>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                AI search engines are changing the game. Your site needs to adapt.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { 
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  ),
                  title: 'AI engines cite sources', 
                  desc: 'ChatGPT, Claude, and Perplexity recommend sites to 100+ million users. If your content isn\'t optimized, you\'re invisible.',
                  stat: '100M+',
                  statLabel: 'AI users'
                },
                { 
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ),
                  title: 'SEO ≠ GEO', 
                  desc: 'LLMs don\'t analyze like Google. They look for structured data, schema.org, and clear semantics.',
                  stat: '4x',
                  statLabel: 'more schema needed'
                },
                { 
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ),
                  title: 'Are your AI bots blocked?', 
                  desc: 'Many sites accidentally block GPTBot, ClaudeBot or PerplexityBot in their robots.txt. We check that for you.',
                  stat: '67%',
                  statLabel: 'of sites block AI'
                },
                { 
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  ),
                  title: 'Actionable insights', 
                  desc: 'Not just a score — get concrete recommendations with code examples you can implement immediately.',
                  stat: '10 min',
                  statLabel: 'to implement'
                },
              ].map((item, i) => (
                <div key={i} className="group bg-white rounded-2xl p-8 border border-amber-100 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-100/50 transition-all duration-300">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-gray-500 leading-relaxed mb-4">{item.desc}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-amber-600">{item.stat}</span>
                        <span className="text-sm text-gray-400">{item.statLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Simple Pricing</h2>
            <p className="text-xl text-gray-600">Free analysis. Pay only for more details.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Free */}
            <div className="card rounded-2xl p-8">
              <div className="text-amber-600 font-semibold mb-2">Free</div>
              <div className="text-4xl font-bold text-gray-900 mb-6">$0</div>
              <ul className="space-y-3 text-gray-600 mb-8">
                <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Overall GEO score</li>
                <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> 4 categories breakdown</li>
                <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Top 3 recommendations</li>
              </ul>
              <button className="btn-secondary w-full py-3 rounded-xl">Get Started</button>
            </div>
            
            {/* Report */}
            <div className="pricing-popular rounded-2xl p-8 relative shadow-xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                Popular
              </div>
              <div className="text-amber-600 font-semibold mb-2">Full Report</div>
              <div className="text-4xl font-bold text-gray-900 mb-6">$29</div>
              <ul className="space-y-3 text-gray-600 mb-8">
                <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Everything in Free</li>
                <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> All recommendations</li>
                <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Code examples</li>
                <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> PDF checklist</li>
              </ul>
              <button className="btn-primary w-full py-3 rounded-xl">Buy Now</button>
            </div>
            
            {/* Guide */}
            <div className="card rounded-2xl p-8">
              <div className="text-amber-600 font-semibold mb-2">GEO Guide</div>
              <div className="text-4xl font-bold text-gray-900 mb-6">$49.99</div>
              <ul className="space-y-3 text-gray-600 mb-8">
                <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> Complete eBook</li>
                <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> robots.txt templates</li>
                <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> llms.txt templates</li>
                <li className="flex items-center gap-2"><span className="text-amber-500">✓</span> JSON-LD examples</li>
              </ul>
              <button className="btn-secondary w-full py-3 rounded-xl">Buy Now</button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold mb-4">
              FAQ
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-500">
              Everything you need to know about GEO
            </p>
          </div>
          
          <div className="space-y-4">
            {[
              {
                q: "What exactly is GEO?",
                a: "GEO stands for Generative Engine Optimization. It's the optimization of your website for AI-powered search engines like ChatGPT, Claude, Gemini, and Perplexity. Unlike traditional SEO that optimizes for Google, GEO optimizes for AI to understand and cite your content."
              },
              {
                q: "What's the difference between SEO and GEO?",
                a: "SEO optimizes for traditional crawlers (Google, Bing) that index pages. GEO optimizes for LLMs that analyze semantic structure, structured data (JSON-LD), and machine readability. Good SEO doesn't guarantee good GEO — the criteria are different."
              },
              {
                q: "How does the CheckGEO analysis work?",
                a: "Our tool analyzes 4 categories: machine readability (semantic HTML, heading hierarchy), structured data (JSON-LD, Schema.org), extraction format (FAQ, meta descriptions), and AI bot accessibility (robots.txt, llms.txt). Each category is worth 25 points for a total of 100."
              },
              {
                q: "What is the llms.txt file?",
                a: "llms.txt is a new standard (like robots.txt) that lets you give specific instructions to LLMs about how to interpret your site. It's optional but recommended for better control over how AI presents your content."
              },
              {
                q: "Why is my score low even though my SEO is good?",
                a: "Good SEO doesn't guarantee good GEO. Common issues: missing JSON-LD structured data, AI bots blocked in robots.txt, no structured FAQ, non-semantic HTML (too many divs), or client-side rendering (CSR) that prevents bots from reading content."
              },
              {
                q: "What's included in the full report?",
                a: "The full report ($29) includes: all detailed recommendations (not just top 3), copy-paste JSON-LD code examples, GEO-optimized robots.txt template, and a printable PDF checklist to track your progress."
              },
              {
                q: "Is the analysis really free?",
                a: "Yes! The basic analysis with GEO score, 4-category breakdown, and top 3 priority recommendations is 100% free, no signup required. You only pay if you want the full report or PDF guide."
              },
            ].map((item, i) => (
              <details key={i} className="group bg-gray-50 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-gray-100 transition-colors">
                  <span className="font-semibold text-gray-900 pr-4">{item.q}</span>
                  <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 group-open:bg-amber-500 transition-colors">
                    <svg className="w-4 h-4 text-amber-600 group-open:text-white group-open:rotate-180 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
          
          <div className="mt-12 text-center p-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
            <p className="text-gray-600 mb-4">Have more questions?</p>
            <a href="mailto:info@checkgeoscore.com" className="inline-flex items-center gap-2 text-amber-600 font-semibold hover:text-amber-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              info@checkgeoscore.com
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <span className="text-white font-bold">G</span>
              </div>
              <span className="font-bold text-gray-900">CheckGEO</span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2026 CheckGEO. Powered by{' '}
              <a href="https://rayv.ca" className="text-amber-600 hover:underline">RayV</a>
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
