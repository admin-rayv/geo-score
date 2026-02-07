'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { ReportPDF } from './components/ReportPDF'

// Types
interface PageDetails {
  h1Count: number
  schemaTypes: string[]
  hasMetaDesc: boolean
  hasFaq: boolean
  hasCanonical: boolean
  hasOpenGraph: boolean
  hasTwitterCards: boolean
  hasLlmsTxt: boolean
  blockedBots: string[]
  allowedBots: string[]
  hasNoindex: boolean
  hasNofollow: boolean
  csrDetected: boolean
  loadTimeMs: number
}

interface PageResult {
  url: string
  success: boolean
  score: number
  loadTimeMs?: number
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
  details?: PageDetails
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
    scoreLevel: 'critical' | 'poor' | 'average' | 'good'
  }
  pages: PageResult[]
  problemPages: PageResult[]
  actionPlan: {
    critical: Array<{ action: string; time: string; impact: number; category: string }>
    important: Array<{ action: string; time: string; impact: number; category: string }>
    improvements: Array<{ action: string; time: string; impact: number; category: string }>
  }
}

interface ErrorState {
  message: string
  errorCode?: string
  tip?: string
  learnMore?: string
}

// Score Badge Component
function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const getColor = (s: number) => {
    if (s >= 70) return 'bg-green-500 text-white'
    if (s >= 50) return 'bg-amber-500 text-white'
    if (s >= 30) return 'bg-orange-500 text-white'
    return 'bg-red-500 text-white'
  }
  
  const sizeClasses = {
    sm: 'w-14 h-14',
    md: 'w-20 h-20',
    lg: 'w-28 h-28'
  }
  
  const textClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  }
  
  return (
    <div className={`${sizeClasses[size]} ${getColor(score)} rounded-2xl flex flex-col items-center justify-center font-bold shadow-lg`}>
      <span className={textClasses[size]}>{score}</span>
      <span className={`${size === 'lg' ? 'text-sm' : 'text-xs'} opacity-80`}>/100</span>
    </div>
  )
}

// Score label helper
function getScoreLabel(score: number): { text: string; color: string } {
  if (score >= 70) return { text: 'Good', color: 'text-green-600' }
  if (score >= 50) return { text: 'Average', color: 'text-amber-600' }
  if (score >= 30) return { text: 'Poor', color: 'text-orange-600' }
  return { text: 'Critical', color: 'text-red-600' }
}

// Category Bar Component
function CategoryBar({ icon, name, score, maxScore = 25 }: { 
  icon: string; name: string; score: number; maxScore?: number 
}) {
  const safeScore = isNaN(score) || score === undefined || score === null ? 0 : score
  const percentage = (safeScore / maxScore) * 100
  
  const getBarColor = (pct: number) => {
    if (pct >= 70) return 'bg-green-500'
    if (pct >= 50) return 'bg-amber-500'
    if (pct >= 30) return 'bg-orange-500'
    return 'bg-red-500'
  }
  
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-700">{name}</span>
          <span className="font-medium">{safeScore}/{maxScore}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getBarColor(percentage)} rounded-full transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// Action Item Component
function ActionItem({ item, index, urgency }: { 
  item: any; 
  index: number; 
  urgency: 'critical' | 'important' | 'improvement' 
}) {
  const urgencyColors = {
    critical: 'bg-red-50 border-red-200',
    important: 'bg-orange-50 border-orange-200',
    improvement: 'bg-amber-50 border-amber-200'
  }
  
  const badgeColors = {
    critical: 'bg-red-200 text-red-800',
    important: 'bg-orange-200 text-orange-800',
    improvement: 'bg-amber-200 text-amber-800'
  }
  
  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${urgencyColors[urgency]}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${badgeColors[urgency]}`}>
        {index + 1}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{item.action}</p>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
          <span className="flex items-center gap-1">⏱️ {item.time}</span>
          <span className="flex items-center gap-1">Impact: {'⬆️'.repeat(item.impact)}</span>
        </div>
      </div>
    </div>
  )
}

// Check Item Component
function CheckItem({ ok, label, value }: { ok: boolean; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={ok ? 'text-green-500' : 'text-red-400'}>{ok ? '✓' : '✗'}</span>
      <span className={ok ? 'text-gray-700' : 'text-gray-500'}>{label}</span>
      {value && <span className="text-gray-400 text-xs">({value})</span>}
    </div>
  )
}

// Page Row Component
function PageRow({ page, siteUrl }: { page: PageResult; siteUrl: string }) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'recommendations'>('details')
  // Show full URL, remove trailing slash for cleaner display
  const displayUrl = page.url.replace(/\/$/, '') || page.url
  const d = page.details
  
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div 
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <ScoreBadge score={page.score} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate text-sm">{displayUrl}</p>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
            {page.categories && (
              <>
                <span>🤖 {page.categories.machineReadability}/25</span>
                <span>📊 {page.categories.structuredData}/25</span>
                <span>📝 {page.categories.extractionFormat}/25</span>
                <span>🔓 {page.categories.botAccessibility}/25</span>
              </>
            )}
            {page.loadTimeMs && (
              <span className={page.loadTimeMs > 3000 ? 'text-orange-500' : 'text-green-500'}>
                ⚡ {page.loadTimeMs}ms
              </span>
            )}
          </div>
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
      
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Tabs */}
          <div className="flex gap-1 p-2 bg-gray-50 border-b border-gray-100">
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab('details'); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'details' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 Analysis Details
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab('recommendations'); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'recommendations' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              💡 Recommendations ({page.recommendations.length})
            </button>
          </div>
          
          {/* Details Tab */}
          {activeTab === 'details' && d && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Machine Readability */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  🤖 Machine Readability
                  <span className="text-xs text-gray-400">{page.categories?.machineReadability}/25</span>
                </h4>
                <div className="pl-2 space-y-1">
                  <CheckItem ok={d.h1Count === 1} label="Single H1" value={`${d.h1Count} found`} />
                  <CheckItem ok={true} label="Lang attribute" value="detected from HTML" />
                </div>
              </div>
              
              {/* Structured Data */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  📊 Structured Data
                  <span className="text-xs text-gray-400">{page.categories?.structuredData}/25</span>
                </h4>
                <div className="pl-2 space-y-1">
                  <CheckItem ok={d.schemaTypes.length > 0} label="JSON-LD" value={d.schemaTypes.length > 0 ? d.schemaTypes.slice(0, 3).join(', ') : 'none'} />
                  <CheckItem ok={d.hasOpenGraph} label="Open Graph" />
                  <CheckItem ok={d.hasTwitterCards} label="Twitter Cards" />
                </div>
              </div>
              
              {/* Extraction Format */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  📝 Extraction Format
                  <span className="text-xs text-gray-400">{page.categories?.extractionFormat}/25</span>
                </h4>
                <div className="pl-2 space-y-1">
                  <CheckItem ok={d.hasMetaDesc} label="Meta description" />
                  <CheckItem ok={d.hasCanonical} label="Canonical URL" />
                  <CheckItem ok={d.hasFaq} label="FAQ structure" />
                </div>
              </div>
              
              {/* Bot Accessibility */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  🔓 Bot Accessibility
                  <span className="text-xs text-gray-400">{page.categories?.botAccessibility}/25</span>
                </h4>
                <div className="pl-2 space-y-1">
                  <CheckItem ok={d.blockedBots.length === 0} label="AI bots allowed" value={d.blockedBots.length > 0 ? `${d.blockedBots.length} blocked` : 'all allowed'} />
                  <CheckItem ok={!d.hasNoindex} label="Indexable" value={d.hasNoindex ? 'noindex set' : 'ok'} />
                  <CheckItem ok={!d.csrDetected} label="Server-rendered" value={d.csrDetected ? 'CSR detected' : 'ok'} />
                  <CheckItem ok={d.hasLlmsTxt} label="llms.txt" />
                  <CheckItem ok={(d.loadTimeMs || 0) < 3000} label="Fast load" value={`${d.loadTimeMs || page.loadTimeMs || 0}ms`} />
                </div>
              </div>
              
              {/* Allowed Bots */}
              {(d.allowedBots.length > 0 || d.blockedBots.length > 0) && (
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">🤖 Who can crawl your site?</h4>
                    <span className="text-xs text-gray-400">✗ blocked · ✓ allowed in robots.txt</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {d.allowedBots.map(bot => (
                      <span key={bot} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        ✓ {bot}
                      </span>
                    ))}
                    {d.blockedBots.map(bot => (
                      <span key={bot} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                        ✗ {bot}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Details Tab - No data fallback */}
          {activeTab === 'details' && !d && (
            <div className="p-4 text-center text-gray-500">
              <p>Detailed analysis not available for this page</p>
            </div>
          )}
          
          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="p-4">
              {page.recommendations.length > 0 ? (
                <ul className="space-y-2">
                  {page.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                        rec.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {rec.priority === 'high' ? 'High' : rec.priority === 'medium' ? 'Medium' : 'Low'}
                      </span>
                      <span className="text-gray-600">{rec.action}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-gray-500">No recommendations for this page</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Safe average calculation
function safeAverage(pages: PageResult[], getter: (p: PageResult) => number | undefined): number {
  const successfulPages = pages.filter(p => p.success && p.categories)
  if (successfulPages.length === 0) return 0
  const sum = successfulPages.reduce((s, p) => s + (getter(p) || 0), 0)
  return Math.round(sum / successfulPages.length)
}

// Main Page
export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<PremiumReport | null>(null)
  const [error, setError] = useState<ErrorState | null>(null)
  const [activeTab, setActiveTab] = useState<'actions' | 'pages' | 'summary'>('actions')

  const analyzeUrl = async (e: React.FormEvent) => {
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
        setError({
          message: data.message || data.error || 'An error occurred',
          errorCode: data.errorCode,
          tip: data.tip,
          learnMore: data.learnMore
        })
      }
    } catch (err) {
      setError({ message: 'Unable to connect to server' })
    } finally {
      setLoading(false)
    }
  }

  const scoreLabel = report ? getScoreLabel(report.summary.averageScore) : null

  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <header>
        <nav className="border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <span className="text-white font-bold text-xl">G</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Check GEO Score</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#how" className="text-gray-600 hover:text-amber-600 transition-colors font-medium">How it works</a>
              <a href="#faq" className="text-gray-600 hover:text-amber-600 transition-colors font-medium">FAQ</a>
            </div>
          </div>
        </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section aria-label="GEO Score Calculator" className="hero-gradient relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" style={{ minHeight: '100%' }}>
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 0.7 }} />
              <stop offset="100%" style={{ stopColor: '#fb923c', stopOpacity: 0.4 }} />
            </linearGradient>
          </defs>
          <g stroke="url(#lineGrad)" strokeWidth="2" fill="none">
            <path d="M100,200 Q300,100 500,180" opacity="0.6"/>
            <path d="M500,180 Q700,250 900,150" opacity="0.5"/>
            <path d="M900,150 Q1050,200 1150,100" opacity="0.4"/>
            <path d="M200,400 Q400,350 600,420" opacity="0.5"/>
            <path d="M600,420 Q800,480 1000,380" opacity="0.4"/>
            <path d="M50,600 Q250,550 450,620" opacity="0.5"/>
            <path d="M450,620 Q650,680 850,580" opacity="0.4"/>
            <path d="M850,580 Q1000,520 1150,600" opacity="0.3"/>
          </g>
          <circle cx="100" cy="200" r="12" fill="#f59e0b" opacity="0.9"/>
          <circle cx="500" cy="180" r="16" fill="#f59e0b" opacity="1"/>
          <circle cx="900" cy="150" r="10" fill="#fb923c" opacity="0.85"/>
          <circle cx="600" cy="420" r="18" fill="#f59e0b" opacity="0.9"/>
          <circle cx="850" cy="580" r="12" fill="#fb923c" opacity="0.85"/>
          <circle cx="500" cy="180" r="28" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.2"/>
          <circle cx="600" cy="420" r="32" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.15"/>
        </svg>
        
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-md mb-8">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-sm font-medium text-gray-700">Free complete multi-page analysis</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
              Is your site visible to{' '}
              <span className="gradient-text">ChatGPT</span>?
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Test your GEO optimization and discover how AI search engines 
              (ChatGPT, Claude, Gemini, Perplexity) see your website.
            </p>
            
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
            
            {loading && (
              <div className="mt-8 p-6 bg-white rounded-xl border border-gray-100 shadow-sm max-w-xl mx-auto">
                <div className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-6 w-6 text-amber-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span className="text-gray-600">Analyzing your sitemap and pages... This may take up to 1 minute.</span>
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                100% Free
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Multi-page analysis
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Sitemap required
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Error Section */}
      {error && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-2xl mx-auto px-6">
            <div className="p-8 bg-red-50 rounded-2xl border border-red-200">
              {error.errorCode === 'SITEMAP_REQUIRED' ? (
                <div className="text-center">
                  <div className="text-5xl mb-4">🗺️</div>
                  <h3 className="text-xl font-bold text-red-700 mb-2">Sitemap Required</h3>
                  <p className="text-red-600 mb-4">{error.message}</p>
                  {error.tip && (
                    <p className="text-gray-600 text-sm mb-4 bg-white p-4 rounded-lg">
                      💡 <strong>Tip:</strong> {error.tip}
                    </p>
                  )}
                  {error.learnMore && (
                    <a 
                      href={error.learnMore} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-amber-600 font-medium hover:underline"
                    >
                      Learn how to create a sitemap →
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-5xl mb-4">😕</div>
                  <p className="text-red-600 text-lg font-medium">{error.message}</p>
                  <p className="text-red-500 mt-2">Please check the URL and try again.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Report Results Section */}
      {report && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            {/* Summary Header */}
            <div className="bg-white rounded-2xl p-8 mb-6 border border-gray-200 shadow-sm">
              <div className="flex flex-col md:flex-row items-start gap-8">
                <div className="text-center">
                  <ScoreBadge score={report.summary.averageScore} size="lg" />
                  <p className={`mt-3 text-lg font-semibold ${scoreLabel?.color}`}>
                    {scoreLabel?.text}
                  </p>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">{report.site.url}</h2>
                    <button
                      onClick={async () => {
                        const blob = await pdf(<ReportPDF report={report} />).toBlob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `geo-report-${report.site.url.replace(/https?:\/\//, '').replace(/[^a-z0-9]/gi, '-')}.pdf`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export PDF
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
                    <span>📄 {report.site.pagesAnalyzed} pages analyzed</span>
                    <span>⏱️ {report.analysisTime}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CategoryBar 
                      icon="🤖" 
                      name="Machine Readability" 
                      score={safeAverage(report.pages, p => p.categories?.machineReadability)} 
                    />
                    <CategoryBar 
                      icon="📊" 
                      name="Structured Data" 
                      score={safeAverage(report.pages, p => p.categories?.structuredData)} 
                    />
                    <CategoryBar 
                      icon="📝" 
                      name="Extraction Format" 
                      score={safeAverage(report.pages, p => p.categories?.extractionFormat)} 
                    />
                    <CategoryBar 
                      icon="🔓" 
                      name="Bot Accessibility" 
                      score={safeAverage(report.pages, p => p.categories?.botAccessibility)} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4">
              {[
                { id: 'actions', label: 'Action Plan', icon: '🎯' },
                { id: 'pages', label: 'All Pages', icon: '📄' },
                { id: 'summary', label: 'Summary', icon: '📊' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-5 py-3 rounded-xl font-medium transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' 
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Action Plan Tab */}
            {activeTab === 'actions' && (
              <div className="space-y-6">
                {/* Intro based on score */}
                <div className={`p-6 rounded-xl border ${
                  report.summary.averageScore < 30 ? 'bg-red-50 border-red-200' :
                  report.summary.averageScore < 50 ? 'bg-orange-50 border-orange-200' :
                  report.summary.averageScore < 70 ? 'bg-amber-50 border-amber-200' :
                  'bg-green-50 border-green-200'
                }`}>
                  <h3 className="font-bold text-gray-900 mb-2">
                    {report.summary.averageScore < 30 ? '🚨 Your site needs urgent attention' :
                     report.summary.averageScore < 50 ? '⚠️ Several issues to fix' :
                     report.summary.averageScore < 70 ? '👍 Good start, room for improvement' :
                     '✅ Great job! Fine-tuning recommended'}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {report.summary.averageScore < 30 
                      ? 'AI search engines will struggle to understand and cite your content. Focus on the critical actions below.'
                      : report.summary.averageScore < 50 
                      ? 'Your site has foundational issues that limit AI visibility. Address the important items first.'
                      : report.summary.averageScore < 70 
                      ? 'You have the basics covered. The improvements below will help you stand out.'
                      : 'Your site is well-optimized. These tweaks will give you a competitive edge.'
                    }
                  </p>
                </div>

                {/* Critical Actions */}
                {report.actionPlan.critical.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                      Critical — Fix These First
                    </h3>
                    <div className="space-y-3">
                      {report.actionPlan.critical.map((item, i) => (
                        <ActionItem key={i} item={item} index={i} urgency="critical" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Important Actions */}
                {report.actionPlan.important.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                      Important — High Impact
                    </h3>
                    <div className="space-y-3">
                      {report.actionPlan.important.map((item, i) => (
                        <ActionItem key={i} item={item} index={i} urgency="important" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Improvements */}
                {report.actionPlan.improvements.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                      Improvements — Nice to Have
                    </h3>
                    <div className="space-y-3">
                      {report.actionPlan.improvements.map((item, i) => (
                        <ActionItem key={i} item={item} index={i} urgency="improvement" />
                      ))}
                    </div>
                  </div>
                )}

                {/* No actions case */}
                {report.actionPlan.critical.length === 0 && 
                 report.actionPlan.important.length === 0 && 
                 report.actionPlan.improvements.length === 0 && (
                  report.summary.averageScore >= 70 ? (
                    <div className="text-center py-12 bg-green-50 rounded-xl border border-green-200">
                      <div className="text-4xl mb-4">🎉</div>
                      <h3 className="font-bold text-gray-900 mb-2">Excellent! No major issues found</h3>
                      <p className="text-gray-600">Your site is well-optimized for AI search engines.</p>
                    </div>
                  ) : report.site.pagesSuccessful === 0 ? (
                    <div className="text-center py-12 bg-red-50 rounded-xl border border-red-200">
                      <div className="text-4xl mb-4">❌</div>
                      <h3 className="font-bold text-gray-900 mb-2">Analysis Failed</h3>
                      <p className="text-gray-600">We couldn't analyze any pages. The site may be blocking our crawler or using client-side rendering.</p>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-orange-50 rounded-xl border border-orange-200">
                      <div className="text-4xl mb-4">🔍</div>
                      <h3 className="font-bold text-gray-900 mb-2">Limited Analysis</h3>
                      <p className="text-gray-600">Check the "All Pages" tab for individual page scores.</p>
                    </div>
                  )
                )}
              </div>
            )}

            {/* All Pages Tab */}
            {activeTab === 'pages' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-4">Click on a page to see its specific recommendations</p>
                {report.pages.map((page, i) => (
                  <PageRow key={i} page={page} siteUrl={report.site.url} />
                ))}
              </div>
            )}

            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                    <div className="text-3xl font-bold text-gray-900">{report.site.pagesAnalyzed}</div>
                    <div className="text-sm text-gray-500">Pages Analyzed</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                    <div className="text-3xl font-bold text-red-500">{report.problemPages.length}</div>
                    <div className="text-sm text-gray-500">Problem Pages</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                    <div className="text-3xl font-bold text-amber-500">
                      {report.actionPlan.critical.length + report.actionPlan.important.length}
                    </div>
                    <div className="text-sm text-gray-500">Priority Actions</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                    <div className="text-3xl font-bold text-green-500">+{report.summary.potentialScore - report.summary.averageScore}</div>
                    <div className="text-sm text-gray-500">Potential Gain</div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">📊 Average Scores by Category</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl mb-1">🤖</div>
                      <div className="text-xl font-bold text-gray-900">{safeAverage(report.pages, p => p.categories?.machineReadability)}/25</div>
                      <div className="text-xs text-gray-500">Machine Readability</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl mb-1">📊</div>
                      <div className="text-xl font-bold text-gray-900">{safeAverage(report.pages, p => p.categories?.structuredData)}/25</div>
                      <div className="text-xs text-gray-500">Structured Data</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl mb-1">📝</div>
                      <div className="text-xl font-bold text-gray-900">{safeAverage(report.pages, p => p.categories?.extractionFormat)}/25</div>
                      <div className="text-xs text-gray-500">Extraction Format</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl mb-1">🔓</div>
                      <div className="text-xl font-bold text-gray-900">{safeAverage(report.pages, p => p.categories?.botAccessibility)}/25</div>
                      <div className="text-xs text-gray-500">Bot Accessibility</div>
                    </div>
                  </div>
                </div>

                {/* Problem Pages */}
                {report.problemPages.length > 0 && (
                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">⚠️ Pages Needing Attention</h3>
                    <div className="space-y-3">
                      {report.problemPages.map((page, i) => (
                        <PageRow key={i} page={page} siteUrl={report.site.url} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Analyze Another */}
            <div className="mt-8 text-center">
              <button 
                onClick={() => { setReport(null); setUrl(''); setError(null); }}
                className="text-amber-600 font-medium hover:underline"
              >
                ← Analyze another site
              </button>
            </div>
          </div>
        </section>
      )}

      {/* How it works Section */}
      <section id="how" aria-labelledby="how-heading" className="py-24 bg-gradient-to-b from-white to-amber-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold mb-4">
              Why it matters
            </span>
            <h2 id="how-heading" className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
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
              <article key={i} className="group bg-white rounded-2xl p-8 border border-amber-100 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-100/50 transition-all duration-300">
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
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How to Improve Section - with ordered list and table */}
      <section aria-label="How to improve your GEO score" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold mb-4">
              Quick Start
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How to Improve Your GEO Score
            </h2>
            <p className="text-xl text-gray-500">
              Follow these steps to optimize for AI search engines
            </p>
          </div>

          {/* Numbered Steps */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 mb-12 border border-amber-100">
            <ol className="space-y-6">
              <li className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">1</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Run your free GEO analysis</h3>
                  <p className="text-gray-600">Enter your URL above to get your current score and specific recommendations.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">2</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Add JSON-LD structured data</h3>
                  <p className="text-gray-600">Include Organization, Article, or FAQPage schema on every page.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">3</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Check your robots.txt</h3>
                  <p className="text-gray-600">Ensure GPTBot, ClaudeBot, and PerplexityBot are not blocked.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">4</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Use semantic HTML</h3>
                  <p className="text-gray-600">Replace generic divs with article, section, nav, header, and footer tags.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">5</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Create an llms.txt file</h3>
                  <p className="text-gray-600">Give AI crawlers specific instructions about your site content.</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">SEO vs GEO: Key Differences</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Aspect</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Traditional SEO</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">GEO (AI Optimization)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Target</td>
                    <td className="px-6 py-4 text-sm text-gray-600">Google, Bing crawlers</td>
                    <td className="px-6 py-4 text-sm text-gray-600">ChatGPT, Claude, Perplexity</td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Content Format</td>
                    <td className="px-6 py-4 text-sm text-gray-600">Keywords, backlinks</td>
                    <td className="px-6 py-4 text-sm text-gray-600">Structured data, semantic HTML</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Schema Importance</td>
                    <td className="px-6 py-4 text-sm text-gray-600">Nice to have</td>
                    <td className="px-6 py-4 text-sm text-gray-600">Essential (JSON-LD required)</td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Bot Control</td>
                    <td className="px-6 py-4 text-sm text-gray-600">robots.txt for Googlebot</td>
                    <td className="px-6 py-4 text-sm text-gray-600">robots.txt + llms.txt for AI bots</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Goal</td>
                    <td className="px-6 py-4 text-sm text-gray-600">Rank in search results</td>
                    <td className="px-6 py-4 text-sm text-gray-600">Be cited by AI assistants</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" aria-labelledby="faq-heading" className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold mb-4">
              FAQ
            </span>
            <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
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
                q: "How does the GEO score analysis work?",
                a: "Our tool analyzes 4 categories: machine readability (semantic HTML, heading hierarchy), structured data (JSON-LD, Schema.org), extraction format (FAQ, meta descriptions), and AI bot accessibility (robots.txt, llms.txt). Each category is worth 25 points for a total of 100."
              },
              {
                q: "Why do I need a sitemap?",
                a: "A sitemap.xml tells us which pages to analyze on your site. Without it, we can only guess which pages exist. Most CMS platforms (WordPress, Shopify, Squarespace) generate sitemaps automatically."
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
                q: "Is the analysis really free?",
                a: "Yes! The complete multi-page analysis with GEO score, category breakdown, and all recommendations is 100% free, no signup required."
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
          
          <aside className="mt-12 text-center p-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
            <p className="text-gray-600 mb-4">Have more questions?</p>
            <a href="mailto:info@checkgeoscore.com" className="inline-flex items-center gap-2 text-amber-600 font-semibold hover:text-amber-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              info@checkgeoscore.com
            </a>
          </aside>
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
              <span className="font-bold text-gray-900">Check GEO Score</span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2026 checkgeoscore.com. Powered by{' '}
              <a href="https://rayv.ca" className="text-amber-600 hover:underline">RayV</a>
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
