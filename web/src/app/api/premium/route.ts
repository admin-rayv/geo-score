import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

// Configuration
const DEFAULT_USER_AGENT = 'GEOScoreBot/1.0 (+https://geoscore.com)'
const TIMEOUT = 15000
const MAX_PAGES = 20

// Bots IA connus
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot',
  'anthropic-ai', 'Claude-Web', 'PerplexityBot', 'Amazonbot',
  'Google-Extended', 'GoogleOther', 'cohere-ai', 'Bytespider'
]

const IMPORTANT_SCHEMAS = [
  'Organization', 'LocalBusiness', 'Person', 'Service',
  'Product', 'FAQPage', 'HowTo', 'Article', 'WebPage', 'BreadcrumbList'
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

// Parse sitemap.xml
async function parseSitemap(rootUrl: string): Promise<string[]> {
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
  
  urls = [...new Set(urls)].slice(0, MAX_PAGES)
  
  if (urls.length === 0) {
    urls = await crawlHomepageLinks(rootUrl)
  }
  
  return urls
}

async function crawlHomepageLinks(rootUrl: string): Promise<string[]> {
  try {
    const html = await fetchUrl(rootUrl)
    const $ = cheerio.load(html)
    const links = new Set([rootUrl])
    
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href')
      if (href) {
        try {
          const fullUrl = new URL(href, rootUrl)
          if (fullUrl.origin === new URL(rootUrl).origin) {
            links.add(`${fullUrl.origin}${fullUrl.pathname}`)
          }
        } catch (e) {}
      }
    })
    
    return [...links].slice(0, MAX_PAGES)
  } catch (e) {
    return [rootUrl]
  }
}

// Analyze a single page (simplified version)
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
  const hasFaq = $('details').length > 0 || $('[class*="faq"]').length > 0
  if (hasFaq) efScore += 7
  
  const metaDesc = $('meta[name="description"]').attr('content')
  if (metaDesc) {
    if (metaDesc.length >= 120 && metaDesc.length <= 160) efScore += 6
    else if (metaDesc.length > 0) efScore += 3
  }
  
  if ($('ol').length > 0) efScore += 4
  if ($('table thead').length > 0) efScore += 4
  
  // Bot Accessibility
  let baScore = 8 // Default if no robots.txt
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
  
  // Generate recommendations
  const recommendations: any[] = []
  
  if (missingSemantic.length > 3) {
    recommendations.push({
      category: 'Lisibilité Machine',
      priority: 'high',
      action: 'Ajouter des balises HTML5 sémantiques (article, section, aside)'
    })
  }
  
  if (h1Count !== 1) {
    recommendations.push({
      category: 'Lisibilité Machine',
      priority: 'high',
      action: h1Count === 0 ? 'Ajouter un H1 unique' : 'Corriger: un seul H1 par page'
    })
  }
  
  if (jsonLdScripts.length === 0) {
    recommendations.push({
      category: 'Données Structurées',
      priority: 'high',
      action: 'Ajouter des schemas JSON-LD (Organization, FAQPage, etc.)'
    })
  }
  
  if (!metaDesc) {
    recommendations.push({
      category: 'Formatage',
      priority: 'high',
      action: 'Ajouter une meta description (120-160 caractères)'
    })
  }
  
  if (!hasFaq) {
    recommendations.push({
      category: 'Formatage',
      priority: 'medium',
      action: 'Ajouter une FAQ avec <details>/<summary>'
    })
  }
  
  if (!llmsTxt) {
    recommendations.push({
      category: 'Accessibilité Bots',
      priority: 'medium',
      action: 'Créer un fichier llms.txt'
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

// Priority action plan
function generateActionPlan(allRecs: any[]) {
  const seen = new Set()
  const quickWins: any[] = []
  const mediumProjects: any[] = []
  
  allRecs.forEach(rec => {
    if (seen.has(rec.action)) return
    seen.add(rec.action)
    
    const item = { ...rec }
    
    if (rec.action.includes('meta description') || rec.action.includes('H1')) {
      item.time = '5-10 min'
      item.impact = 3
      quickWins.push(item)
    } else if (rec.action.includes('JSON-LD') || rec.action.includes('llms.txt')) {
      item.time = '30 min'
      item.impact = 3
      mediumProjects.push(item)
    } else {
      item.time = '1h+'
      item.impact = 2
      mediumProjects.push(item)
    }
  })
  
  return { quickWins: quickWins.slice(0, 5), mediumProjects: mediumProjects.slice(0, 5) }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ success: false, error: 'URL requise' }, { status: 400 })
  }
  
  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = 'https://' + normalizedUrl
  }
  
  try {
    const rootUrl = getRootUrl(normalizedUrl)
    const startTime = Date.now()
    
    // Get pages from sitemap
    const pageUrls = await parseSitemap(rootUrl)
    
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
    
    // Aggregate recommendations
    const allRecs: any[] = []
    pageResults.forEach(p => {
      if (p.recommendations) {
        p.recommendations.forEach((r: any) => allRecs.push({ ...r, pageUrl: p.url }))
      }
    })
    
    const actionPlan = generateActionPlan(allRecs)
    
    // Problem pages
    const problemPages = successful.filter(p => p.score < 50).sort((a, b) => a.score - b.score).slice(0, 5)
    
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
        highestScore: successful.length ? Math.max(...successful.map(p => p.score)) : 0
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
