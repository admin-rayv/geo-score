import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

// Configuration
const DEFAULT_USER_AGENT = 'getGEOscoreBot/1.0 (+https://checkgeoscore.com)'
const TIMEOUT = 15000
const MAX_PAGES = 20

// AI Bots
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot',
  'anthropic-ai', 'Claude-Web', 'PerplexityBot', 'Amazonbot',
  'Google-Extended', 'GoogleOther', 'cohere-ai', 'Bytespider'
]

// Fetch helper
async function fetchUrl(url: string, timeout = TIMEOUT): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

function getRootUrl(url: string): string {
  const parsed = new URL(url)
  return `${parsed.protocol}//${parsed.host}`
}

// Parse sitemap.xml - returns { found: boolean, urls: string[] }
async function parseSitemap(rootUrl: string): Promise<{ found: boolean; urls: string[] }> {
  const sitemapUrls = [
    `${rootUrl}/sitemap.xml`,
    `${rootUrl}/sitemap_index.xml`,
  ]
  
  let urls: string[] = []
  
  for (const sitemapUrl of sitemapUrls) {
    try {
      const content = await fetchUrl(sitemapUrl, 10000)
      const $ = cheerio.load(content, { xmlMode: true })
      
      const sitemapLocs = $('sitemap > loc').map((i, el) => $(el).text()).get()
      
      if (sitemapLocs.length > 0) {
        for (const subSitemapUrl of sitemapLocs.slice(0, 2)) {
          try {
            const subContent = await fetchUrl(subSitemapUrl, 10000)
            const $sub = cheerio.load(subContent, { xmlMode: true })
            urls = urls.concat($sub('url > loc').map((i, el) => $sub(el).text()).get())
          } catch (e) {}
        }
      } else {
        urls = $('url > loc').map((i, el) => $(el).text()).get()
      }
      
      if (urls.length > 0) break
    } catch (e) {}
  }
  
  // Filter URLs to only include those matching the root domain
  const rootHost = new URL(rootUrl).host
  urls = urls.filter(url => {
    try {
      return new URL(url).host === rootHost
    } catch {
      return false
    }
  })
  
  urls = [...new Set(urls)].slice(0, MAX_PAGES)
  
  return { found: urls.length > 0, urls }
}

// Removed crawlHomepageLinks - sitemap is now required for premium report
    })
    
    return [...links].slice(0, MAX_PAGES)
  } catch (e) {
    return [rootUrl]
  }
}

// Analyze a single page
function analyzePageContent($: cheerio.CheerioAPI, html: string, robotsTxt: string | null, llmsTxt: string | null) {
  // Machine Readability
  const semanticTags = ['article', 'section', 'aside', 'nav', 'header', 'footer', 'main', 'details']
  const foundSemantic = semanticTags.filter(tag => $(tag).length > 0)
  const missingSemantic = semanticTags.filter(tag => $(tag).length === 0)
  
  const h1Count = $('h1').length
  const h2Count = $('h2').length
  
  let mrScore = Math.min(8, foundSemantic.length)
  if (h1Count === 1) mrScore += 3
  if (h2Count > 0) mrScore += 2
  
  const textContent = $('body').text().replace(/\s+/g, ' ').trim()
  if (textContent.length > 500) mrScore += 5
  
  // Structured Data
  let sdScore = 0
  const schemaTypes: string[] = []
  const jsonLdScripts = $('script[type="application/ld+json"]')
  
  if (jsonLdScripts.length > 0) {
    sdScore = 10
    jsonLdScripts.each((i, el) => {
      try {
        const data = JSON.parse($(el).html() || '')
        const schemas = Array.isArray(data) ? data : [data]
        schemas.forEach((s: any) => {
          if (s['@type']) schemaTypes.push(s['@type'])
          if (s['@graph']) s['@graph'].forEach((item: any) => {
            if (item['@type']) schemaTypes.push(item['@type'])
          })
        })
      } catch (e) {}
    })
    sdScore += Math.min(10, schemaTypes.length * 2)
    if (schemaTypes.length > 3) sdScore += 5
  }
  
  // Extraction Format
  let efScore = 0
  const hasFaq = $('details').length > 0 || $('[class*="faq"]').length > 0 || $('[class*="accordion"]').length > 0
  if (hasFaq) efScore += 7
  
  const metaDesc = $('meta[name="description"]').attr('content')
  if (metaDesc) {
    if (metaDesc.length >= 120 && metaDesc.length <= 160) efScore += 6
    else if (metaDesc.length > 0) efScore += 3
  }
  
  if ($('ol').length > 0) efScore += 4
  if ($('table thead').length > 0) efScore += 4
  
  // Bot Accessibility
  let baScore = 8
  if (robotsTxt) {
    const hasBlock = /Disallow:\s*\/\s*$/m.test(robotsTxt)
    baScore = hasBlock ? 2 : 8
  }
  if (llmsTxt) baScore += 7
  
  const images = $('img')
  let imagesWithAlt = 0
  images.each((i, img) => {
    if ($(img).attr('alt')?.trim()) imagesWithAlt++
  })
  if (images.length > 0) {
    baScore += Math.round((imagesWithAlt / images.length) * 5)
  } else {
    baScore += 5
  }
  
  const totalScore = mrScore + sdScore + efScore + baScore
  
  // Generate recommendations (in English)
  const recommendations: any[] = []
  
  if (missingSemantic.length > 3) {
    recommendations.push({
      category: 'Machine Readability',
      priority: 'high',
      action: 'Add semantic HTML5 tags (article, section, aside, main)'
    })
  }
  
  if (h1Count !== 1) {
    recommendations.push({
      category: 'Machine Readability',
      priority: 'high',
      action: h1Count === 0 ? 'Add a unique H1 heading to this page' : 'Fix: only one H1 per page is recommended'
    })
  }
  
  if (jsonLdScripts.length === 0) {
    recommendations.push({
      category: 'Structured Data',
      priority: 'high',
      action: 'Add JSON-LD structured data (Organization, FAQPage, etc.)'
    })
  }
  
  if (!metaDesc) {
    recommendations.push({
      category: 'Extraction Format',
      priority: 'high',
      action: 'Add a meta description (120-160 characters)'
    })
  } else if (metaDesc.length < 120 || metaDesc.length > 160) {
    recommendations.push({
      category: 'Extraction Format',
      priority: 'medium',
      action: `Optimize meta description length (currently ${metaDesc.length} chars, ideal: 120-160)`
    })
  }
  
  if (!hasFaq) {
    recommendations.push({
      category: 'Extraction Format',
      priority: 'medium',
      action: 'Add FAQ section using <details>/<summary> elements'
    })
  }
  
  if (!llmsTxt) {
    recommendations.push({
      category: 'Bot Accessibility',
      priority: 'medium',
      action: 'Create an llms.txt file to guide AI crawlers'
    })
  }
  
  if (images.length > 0 && imagesWithAlt < images.length) {
    const missing = images.length - imagesWithAlt
    recommendations.push({
      category: 'Bot Accessibility',
      priority: 'medium',
      action: `Add alt text to ${missing} image${missing > 1 ? 's' : ''}`
    })
  }
  
  return {
    score: Math.min(100, totalScore),
    categories: {
      machineReadability: mrScore,
      structuredData: sdScore,
      extractionFormat: efScore,
      botAccessibility: baScore
    },
    recommendations,
    details: {
      h1Count,
      schemaTypes,
      hasMetaDesc: !!metaDesc,
      hasFaq,
      hasLlmsTxt: !!llmsTxt
    }
  }
}

async function analyzePage(url: string, rootUrl: string) {
  try {
    const [html, robotsTxt, llmsTxt] = await Promise.all([
      fetchUrl(url),
      fetchUrl(`${rootUrl}/robots.txt`).catch(() => null),
      fetchUrl(`${rootUrl}/llms.txt`).catch(() => null)
    ])
    
    const $ = cheerio.load(html)
    const analysis = analyzePageContent($, html, robotsTxt, llmsTxt)
    
    return { url, success: true, ...analysis }
  } catch (error: any) {
    return { url, success: false, error: error.message, score: 0, categories: null, recommendations: [] }
  }
}

// Smart action plan based on score
function generateActionPlan(allRecs: any[], avgScore: number) {
  const seen = new Set()
  const critical: any[] = []
  const important: any[] = []
  const improvements: any[] = []
  
  // Determine urgency thresholds based on overall score
  const isCriticalSite = avgScore < 30
  const isPoorSite = avgScore < 50
  
  allRecs.forEach(rec => {
    if (seen.has(rec.action)) return
    seen.add(rec.action)
    
    // Estimate time and impact
    let time = '1-2 hours'
    let impact = 2
    
    if (rec.action.includes('meta description')) {
      time = '5 min'
      impact = 2
    } else if (rec.action.includes('H1')) {
      time = '5 min'
      impact = 3
    } else if (rec.action.includes('JSON-LD')) {
      time = '30 min'
      impact = 3
    } else if (rec.action.includes('llms.txt')) {
      time = '15 min'
      impact = 2
    } else if (rec.action.includes('alt text')) {
      time = '15-30 min'
      impact = 2
    } else if (rec.action.includes('semantic')) {
      time = '1-2 hours'
      impact = 3
    } else if (rec.action.includes('FAQ')) {
      time = '30 min'
      impact = 2
    }
    
    const item = { ...rec, time, impact }
    
    // Categorize based on site score AND recommendation priority
    if (isCriticalSite) {
      // Critical site: high priority = critical, everything else = important
      if (rec.priority === 'high') {
        critical.push(item)
      } else {
        important.push(item)
      }
    } else if (isPoorSite) {
      // Poor site: high = important, medium = improvements
      if (rec.priority === 'high') {
        important.push(item)
      } else {
        improvements.push(item)
      }
    } else {
      // Average/good site: everything is improvements
      improvements.push(item)
    }
  })
  
  // Sort by impact (highest first)
  const sortByImpact = (a: any, b: any) => b.impact - a.impact
  
  return { 
    critical: critical.sort(sortByImpact).slice(0, 5), 
    important: important.sort(sortByImpact).slice(0, 5), 
    improvements: improvements.sort(sortByImpact).slice(0, 5)
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ success: false, error: 'URL required' }, { status: 400 })
  }
  
  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = 'https://' + normalizedUrl
  }
  
  try {
    const rootUrl = getRootUrl(normalizedUrl)
    const startTime = Date.now()
    
    // Get pages from sitemap
    const sitemap = await parseSitemap(rootUrl)
    
    // Sitemap is required for premium report
    if (!sitemap.found) {
      return NextResponse.json({
        success: false,
        error: 'No sitemap found',
        errorCode: 'SITEMAP_REQUIRED',
        message: 'A sitemap.xml is required for the Premium Report. This file helps AI search engines discover and index all your pages.',
        tip: 'Create a sitemap.xml at your site root listing all your important pages. Most CMS (WordPress, Shopify, etc.) can generate this automatically.',
        learnMore: 'https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap'
      }, { status: 400 })
    }
    
    const pageUrls = sitemap.urls
    
    // Analyze each page
    const pageResults = []
    for (const pageUrl of pageUrls) {
      const result = await analyzePage(pageUrl, rootUrl)
      pageResults.push(result)
      if (pageUrls.indexOf(pageUrl) < pageUrls.length - 1) {
        await new Promise(r => setTimeout(r, 300))
      }
    }
    
    const successful = pageResults.filter(p => p.success)
    const avgScore = successful.length ? Math.round(successful.reduce((s, p) => s + p.score, 0) / successful.length) : 0
    
    // Determine score level
    let scoreLevel: 'critical' | 'poor' | 'average' | 'good'
    if (avgScore < 30) scoreLevel = 'critical'
    else if (avgScore < 50) scoreLevel = 'poor'
    else if (avgScore < 70) scoreLevel = 'average'
    else scoreLevel = 'good'
    
    // Aggregate recommendations
    const allRecs: any[] = []
    pageResults.forEach(p => {
      if (p.recommendations) {
        p.recommendations.forEach((r: any) => allRecs.push({ ...r, pageUrl: p.url }))
      }
    })
    
    const actionPlan = generateActionPlan(allRecs, avgScore)
    
    // Problem pages (score < 40)
    const problemPages = successful.filter(p => p.score < 40).sort((a, b) => a.score - b.score).slice(0, 5)
    
    return NextResponse.json({
      success: true,
      reportType: 'premium',
      generatedAt: new Date().toISOString(),
      analysisTime: `${Math.round((Date.now() - startTime) / 1000)}s`,
      site: {
        url: rootUrl,
        pagesAnalyzed: pageResults.length,
        pagesSuccessful: successful.length
      },
      summary: {
        averageScore: avgScore,
        potentialScore: Math.min(100, avgScore + 30),
        lowestScore: successful.length ? Math.min(...successful.map(p => p.score)) : 0,
        highestScore: successful.length ? Math.max(...successful.map(p => p.score)) : 0,
        scoreLevel
      },
      pages: pageResults.map(p => ({
        url: p.url,
        success: p.success,
        score: p.score,
        categories: p.categories,
        recommendations: p.recommendations?.slice(0, 5) || []
      })),
      problemPages,
      actionPlan
    })
    
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
