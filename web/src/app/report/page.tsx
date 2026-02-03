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

// Score badge component
function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const getColor = (s: number) => {
    if (s >= 70) return 'bg-green-500 text-white'
    if (s >= 50) return 'bg-amber-500 text-white'
    if (s >= 30) return 'bg-orange-500 text-white'
    return 'bg-red-500 text-white'
  }
  
  const sizeClasses = {
    sm: 'w-12 h-12 text-base',
    md: 'w-16 h-16 text-xl',
    lg: 'w-24 h-24 text-3xl'
  }
  
  return (
    <div className={`${sizeClasses[size]} ${getColor(score)} rounded-2xl flex items-center justify-center font-bold shadow-lg`}>
      {score}
    </div>
  )
}

// Score label
function getScoreLabel(score: number): { text: string; color: string } {
  if (score >= 70) return { text: 'Good', color: 'text-green-600' }
  if (score >= 50) return { text: 'Average', color: 'text-amber-600' }
  if (score >= 30) return { text: 'Poor', color: 'text-orange-600' }
  return { text: 'Critical', color: 'text-red-600' }
}

// Category bar
function CategoryBar({ label, score, max = 25, icon }: { label: string; score: number; max?: number; icon: string }) {
  const percentage = (score / max) * 100
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
          <span className="text-gray-700">{label}</span>
          <span className="font-medium">{score}/{max}</span>
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

// Page row component
function PageRow({ page, siteUrl }: { page: PageResult; siteUrl: string }) {
  const [expanded, setExpanded] = useState(false)
  const shortUrl = page.url.replace(siteUrl, '') || '/'
  
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div 
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <ScoreBadge score={page.score} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{shortUrl}</p>
          {page.categories && (
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
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
          <p className="text-sm font-medium text-gray-700 mb-3">Recommendations:</p>
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
        </div>
      )}
    </div>
  )
}

// Action item component
function ActionItem({ item, index, urgency }: { item: any; index: number; urgency: 'critical' | 'important' | 'improvement' }) {
  const urgencyColors = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    important: 'bg-orange-100 text-orange-700 border-orange-200',
    improvement: 'bg-amber-100 text-amber-700 border-amber-200'
  }
  
  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${urgencyColors[urgency]}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
        urgency === 'critical' ? 'bg-red-200 text-red-800' :
        urgency === 'important' ? 'bg-orange-200 text-orange-800' :
        'bg-amber-200 text-amber-800'
      }`}>
        {index + 1}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{item.action}</p>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            ⏱️ {item.time}
          </span>
          <span className="flex items-center gap-1">
            Impact: {'⬆️'.repeat(item.impact)}
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
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'actions'>('actions')

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
        setError(data.error || 'An error occurred')
      }
    } catch (err) {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const scoreLabel = report ? getScoreLabel(report.summary.averageScore) : null

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <span className="text-white font-bold text-xl">G</span>
              </div>
              <span className="text-xl font-bold text-gray-900">GEOScore</span>
            </Link>
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
              Premium Report
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Input Form */}
        {!report && (
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Premium GEO Report
            </h1>
            <p className="text-gray-600 mb-8">
              Complete analysis of your entire site with prioritized action plan
            </p>
            
            <form onSubmit={generateReport}>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-site.com"
                  className="flex-1 px-5 py-4 rounded-xl border-2 border-gray-200 focus:border-amber-500 focus:ring-0 outline-none text-lg"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl disabled:opacity-50 shadow-lg shadow-amber-500/30 hover:shadow-xl transition-shadow"
                >
                  {loading ? 'Analyzing...' : 'Generate Report'}
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
                  <span className="text-gray-600">Analyzing pages... This may take up to 1 minute.</span>
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
            <div className="bg-white rounded-2xl p-8 mb-6 border border-gray-200 shadow-sm">
              <div className="flex flex-col md:flex-row items-start gap-8">
                <div className="text-center">
                  <ScoreBadge score={report.summary.averageScore} size="lg" />
                  <p className={`mt-3 text-lg font-semibold ${scoreLabel?.color}`}>
                    {scoreLabel?.text}
                  </p>
                </div>
                
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{report.site.url}</h2>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
                    <span>📄 {report.site.pagesAnalyzed} pages analyzed</span>
                    <span>⏱️ {report.analysisTime}</span>
                  </div>
                  
                  {/* Category breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CategoryBar 
                      icon="🤖" 
                      label="Machine Readability" 
                      score={Math.round(report.pages.reduce((s, p) => s + (p.categories?.machineReadability || 0), 0) / report.pages.filter(p => p.success).length)} 
                    />
                    <CategoryBar 
                      icon="📊" 
                      label="Structured Data" 
                      score={Math.round(report.pages.reduce((s, p) => s + (p.categories?.structuredData || 0), 0) / report.pages.filter(p => p.success).length)} 
                    />
                    <CategoryBar 
                      icon="📝" 
                      label="Extraction Format" 
                      score={Math.round(report.pages.reduce((s, p) => s + (p.categories?.extractionFormat || 0), 0) / report.pages.filter(p => p.success).length)} 
                    />
                    <CategoryBar 
                      icon="🔓" 
                      label="Bot Accessibility" 
                      score={Math.round(report.pages.reduce((s, p) => s + (p.categories?.botAccessibility || 0), 0) / report.pages.filter(p => p.success).length)} 
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
                { id: 'overview', label: 'Summary', icon: '📊' },
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

            {/* Tab Content */}
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
                  <div className="text-center py-12 bg-green-50 rounded-xl border border-green-200">
                    <div className="text-4xl mb-4">🎉</div>
                    <h3 className="font-bold text-gray-900 mb-2">Excellent! No major issues found</h3>
                    <p className="text-gray-600">Your site is well-optimized for AI search engines.</p>
                  </div>
                )}

                {/* CTA */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-8 border border-amber-200 text-center mt-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Need help implementing these changes?</h3>
                  <p className="text-gray-600 mb-4">
                    The complete GEO Guide includes copy-paste code examples for each recommendation
                  </p>
                  <button className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl transition-shadow">
                    Get the GEO Guide — $49.99
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'pages' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-4">Click on a page to see its specific recommendations</p>
                {report.pages.map((page, i) => (
                  <PageRow key={i} page={page} siteUrl={report.site.url} />
                ))}
              </div>
            )}

            {activeTab === 'overview' && (
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

            {/* Generate New Report */}
            <div className="mt-8 text-center">
              <button 
                onClick={() => setReport(null)}
                className="text-amber-600 font-medium hover:underline"
              >
                ← Analyze another site
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
