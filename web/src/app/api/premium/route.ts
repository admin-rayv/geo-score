import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

// Configuration
const DEFAULT_USER_AGENT = 'CheckGEOScoreBot/1.0 (+https://checkgeoscore.com)'
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

// Fetch with timing
async function fetchUrlWithTiming(url: string, timeout = TIMEOUT): Promise<{ content: string; loadTimeMs: number }> {
  const startTime = Date.now()
  const content = await fetchUrl(url, timeout)
  const loadTimeMs = Date.now() - startTime
  return { content, loadTimeMs }
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
  
  urls = Array.from(new Set(urls)).slice(0, MAX_PAGES)
  
  return { found: urls.length > 0, urls }
}

// Fallback: crawl homepage for internal links when no sitemap
async function crawlHomepageLinks(rootUrl: string): Promise<string[]> {
  const MAX_CRAWL_PAGES = 15
  
  try {
    const html = await fetchUrl(rootUrl, 10000)
    const $ = cheerio.load(html)
    const rootHost = new URL(rootUrl).host
    
    const links = new Set<string>()
    links.add(rootUrl) // Always include homepage
    
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href')
      if (!href) return
      
      try {
        // Resolve relative URLs
        const absoluteUrl = new URL(href, rootUrl).href
        const parsedUrl = new URL(absoluteUrl)
        
        // Only internal links
        if (parsedUrl.host !== rootHost) return
        
        // Skip anchors, query strings, and common non-content paths
        if (parsedUrl.hash && parsedUrl.pathname === new URL(rootUrl).pathname) return
        
        // Skip common non-content URLs
        const skipPatterns = [
          '/wp-admin', '/wp-login', '/cart', '/checkout', '/my-account',
          '/login', '/register', '/admin', '/api/', '/feed', '/rss',
          '.pdf', '.jpg', '.png', '.gif', '.css', '.js', '.xml'
        ]
        const pathLower = parsedUrl.pathname.toLowerCase()
        if (skipPatterns.some(p => pathLower.includes(p))) return
        
        // Clean URL (remove query string and trailing slash for dedup)
        const cleanUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`.replace(/\/$/, '') || rootUrl
        links.add(cleanUrl)
        
      } catch (e) {
        // Invalid URL, skip
      }
    })
    
    return Array.from(links).slice(0, MAX_CRAWL_PAGES)
  } catch (e) {
    // If homepage fails, just return the root URL
    return [rootUrl]
  }
}

// Analyze a single page
function analyzePageContent($: cheerio.CheerioAPI, html: string, robotsTxt: string | null, llmsTxt: string | null, loadTimeMs: number = 0) {
  // ===== MACHINE READABILITY (25 pts) =====
  let mrScore = 0
  const mrIssues: string[] = []
  
  // 1. Semantic tags (6 pts)
  const semanticTags = ['article', 'section', 'aside', 'nav', 'header', 'footer', 'main']
  const foundSemantic = semanticTags.filter(tag => $(tag).length > 0)
  const missingSemantic = semanticTags.filter(tag => $(tag).length === 0)
  const semanticScore = Math.min(6, Math.round((foundSemantic.length / semanticTags.length) * 6))
  mrScore += semanticScore
  if (foundSemantic.length < 4) {
    mrIssues.push(`missing_semantic:${missingSemantic.slice(0, 3).join(',')}`)
  }
  
  // 2. Heading hierarchy - no skips (5 pts)
  const h1Count = $('h1').length
  const h2Count = $('h2').length
  const h3Count = $('h3').length
  const h4Count = $('h4').length
  
  let headingScore = 0
  let headingIssue = ''
  
  if (h1Count === 1) {
    headingScore += 2
  } else if (h1Count === 0) {
    headingIssue = 'no_h1'
  } else {
    headingIssue = 'multiple_h1'
  }
  
  // Check hierarchy: H1 should exist before H2, H2 before H3, etc.
  const hasProperHierarchy = (
    (h2Count === 0 || h1Count > 0) && // H2 requires H1
    (h3Count === 0 || h2Count > 0) && // H3 requires H2
    (h4Count === 0 || h3Count > 0)    // H4 requires H3
  )
  
  if (hasProperHierarchy && h2Count > 0) {
    headingScore += 3
  } else if (!hasProperHierarchy) {
    headingIssue = headingIssue || 'heading_skip'
    mrIssues.push('heading_hierarchy_broken')
  } else if (h2Count === 0 && h1Count > 0) {
    headingScore += 1 // Only H1, no structure
  }
  
  mrScore += headingScore
  if (headingIssue) mrIssues.push(headingIssue)
  
  // 3. Div vs Semantic ratio (5 pts)
  const divCount = $('div').length
  const totalSemantic = foundSemantic.reduce((sum, tag) => sum + $(tag).length, 0)
  const semanticRatio = totalSemantic / (divCount + totalSemantic + 1) // +1 to avoid division by zero
  
  let ratioScore = 0
  if (semanticRatio >= 0.3) ratioScore = 5       // Excellent: 30%+ semantic
  else if (semanticRatio >= 0.2) ratioScore = 4  // Good: 20-30%
  else if (semanticRatio >= 0.1) ratioScore = 2  // Poor: 10-20%
  else ratioScore = 0                             // Bad: <10%
  
  mrScore += ratioScore
  if (semanticRatio < 0.15) {
    mrIssues.push('too_many_divs')
  }
  
  // 4. Lang attribute (4 pts)
  const htmlLang = $('html').attr('lang')
  let langScore = 0
  if (htmlLang && htmlLang.length >= 2) {
    langScore = 4
  } else {
    mrIssues.push('missing_lang')
  }
  mrScore += langScore
  
  // 5. ARIA Landmarks (5 pts)
  const ariaLandmarks = [
    '[role="banner"]', '[role="navigation"]', '[role="main"]', 
    '[role="contentinfo"]', '[role="complementary"]', '[role="search"]'
  ]
  const foundAriaLandmarks = ariaLandmarks.filter(selector => $(selector).length > 0)
  // Also count implicit landmarks from semantic elements
  const implicitLandmarks = ['header', 'nav', 'main', 'footer', 'aside'].filter(tag => $(tag).length > 0)
  const allLandmarks = foundAriaLandmarks.map(s => s.replace('[role="', '').replace('"]', '')).concat(implicitLandmarks)
  const totalLandmarks = new Set(allLandmarks).size
  
  let landmarkScore = Math.min(5, totalLandmarks)
  mrScore += landmarkScore
  if (totalLandmarks < 3) {
    mrIssues.push('few_landmarks')
  }
  
  // Cap at 25
  mrScore = Math.min(25, mrScore)
  
  // ===== STRUCTURED DATA (25 pts) =====
  let sdScore = 0
  const sdIssues: string[] = []
  const schemaTypes: string[] = []
  const jsonLdScripts = $('script[type="application/ld+json"]')
  
  // Recommended schemas for GEO
  const recommendedSchemas = ['Organization', 'WebSite', 'Article', 'FAQPage', 'HowTo', 'Product', 'LocalBusiness', 'Person', 'BreadcrumbList']
  
  // 1. JSON-LD presence and validation (10 pts)
  let jsonLdValid = false
  let jsonLdErrors: string[] = []
  
  if (jsonLdScripts.length > 0) {
    sdScore += 4 // Base points for having JSON-LD
    
    jsonLdScripts.each((i, el) => {
      try {
        const rawJson = $(el).html() || ''
        const data = JSON.parse(rawJson)
        const schemas = Array.isArray(data) ? data : [data]
        
        schemas.forEach((s: any) => {
          // Check @context
          if (s['@context'] && (s['@context'] === 'https://schema.org' || s['@context'] === 'http://schema.org' || s['@context']?.['@vocab']?.includes('schema.org'))) {
            jsonLdValid = true
          }
          
          // Collect types
          if (s['@type']) {
            const types = Array.isArray(s['@type']) ? s['@type'] : [s['@type']]
            schemaTypes.push(...types)
          }
          
          // Check @graph
          if (s['@graph'] && Array.isArray(s['@graph'])) {
            jsonLdValid = true
            s['@graph'].forEach((item: any) => {
              if (item['@type']) {
                const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']]
                schemaTypes.push(...types)
              }
            })
          }
        })
      } catch (e: any) {
        jsonLdErrors.push(e.message)
      }
    })
    
    // Points for valid JSON-LD
    if (jsonLdValid) {
      sdScore += 3
    } else {
      sdIssues.push('jsonld_no_context')
    }
    
    if (jsonLdErrors.length > 0) {
      sdIssues.push('jsonld_parse_error')
      sdScore -= 2 // Penalty for invalid JSON
    }
    
    // Points for number of schema types (max 3 pts)
    sdScore += Math.min(3, schemaTypes.length)
    
  } else {
    sdIssues.push('no_jsonld')
  }
  
  // 2. Recommended schemas check (5 pts)
  const foundRecommended = recommendedSchemas.filter(s => schemaTypes.includes(s))
  const hasGeoSchemas = foundRecommended.length > 0
  
  if (foundRecommended.length >= 3) {
    sdScore += 5
  } else if (foundRecommended.length >= 2) {
    sdScore += 3
  } else if (foundRecommended.length >= 1) {
    sdScore += 2
  } else {
    sdIssues.push('no_recommended_schemas')
  }
  
  // 3. Open Graph tags (5 pts)
  const ogTitle = $('meta[property="og:title"]').attr('content')
  const ogDesc = $('meta[property="og:description"]').attr('content')
  const ogImage = $('meta[property="og:image"]').attr('content')
  const ogType = $('meta[property="og:type"]').attr('content')
  const ogUrl = $('meta[property="og:url"]').attr('content')
  
  let ogScore = 0
  const ogTags = [ogTitle, ogDesc, ogImage, ogType, ogUrl].filter(Boolean)
  
  if (ogTags.length >= 4) {
    ogScore = 5
  } else if (ogTags.length >= 3) {
    ogScore = 4
  } else if (ogTags.length >= 2) {
    ogScore = 2
  } else if (ogTags.length >= 1) {
    ogScore = 1
  } else {
    sdIssues.push('no_opengraph')
  }
  sdScore += ogScore
  
  // 4. Twitter Cards (5 pts)
  const twCard = $('meta[name="twitter:card"]').attr('content')
  const twTitle = $('meta[name="twitter:title"]').attr('content')
  const twDesc = $('meta[name="twitter:description"]').attr('content')
  const twImage = $('meta[name="twitter:image"]').attr('content')
  
  let twScore = 0
  const twTags = [twCard, twTitle, twDesc, twImage].filter(Boolean)
  
  if (twTags.length >= 3) {
    twScore = 5
  } else if (twTags.length >= 2) {
    twScore = 3
  } else if (twTags.length >= 1) {
    twScore = 1
  } else {
    sdIssues.push('no_twitter_cards')
  }
  sdScore += twScore
  
  // Cap at 25
  sdScore = Math.min(25, sdScore)
  
  // ===== EXTRACTION FORMAT (25 pts) =====
  let efScore = 0
  const efIssues: string[] = []
  
  // 1. Meta description (5 pts)
  const metaDesc = $('meta[name="description"]').attr('content')
  if (metaDesc) {
    if (metaDesc.length >= 120 && metaDesc.length <= 160) {
      efScore += 5
    } else if (metaDesc.length >= 80) {
      efScore += 3
    } else {
      efScore += 1
      efIssues.push(`meta_desc_short:${metaDesc.length}`)
    }
  } else {
    efIssues.push('no_meta_desc')
  }
  
  // 2. Canonical URL (3 pts)
  const canonicalUrl = $('link[rel="canonical"]').attr('href')
  if (canonicalUrl && canonicalUrl.length > 0) {
    efScore += 3
  } else {
    efIssues.push('no_canonical')
  }
  
  // 3. FAQ structure (4 pts)
  const hasDetailsSummary = $('details summary').length > 0
  const hasFaqClass = $('[class*="faq"]').length > 0 || $('[class*="accordion"]').length > 0
  const hasFaqSchema = schemaTypes.includes('FAQPage')
  
  if (hasDetailsSummary || hasFaqSchema) {
    efScore += 4
  } else if (hasFaqClass) {
    efScore += 2
    efIssues.push('faq_not_semantic')
  } else {
    efIssues.push('no_faq')
  }
  
  // 4. Ordered lists - steps/instructions (3 pts)
  const olCount = $('ol').length
  const olWithLi = $('ol li').length
  if (olWithLi >= 3) {
    efScore += 3
  } else if (olCount > 0) {
    efScore += 1
  }
  
  // 5. How-to structure (3 pts)
  const hasHowToSchema = schemaTypes.includes('HowTo')
  const hasStepsClass = $('[class*="step"]').length >= 2
  const hasNumberedSteps = $('ol li').length >= 3
  
  if (hasHowToSchema) {
    efScore += 3
  } else if (hasStepsClass || hasNumberedSteps) {
    efScore += 1
  }
  
  // 6. Definition lists (3 pts)
  const dlCount = $('dl').length
  const dtCount = $('dt').length
  const ddCount = $('dd').length
  
  if (dlCount > 0 && dtCount > 0 && ddCount > 0) {
    efScore += 3
  } else if (dlCount > 0) {
    efScore += 1
    efIssues.push('dl_incomplete')
  }
  
  // 7. Blockquotes - citations (2 pts)
  const blockquoteCount = $('blockquote').length
  const hasCite = $('blockquote cite').length > 0 || $('blockquote[cite]').length > 0
  
  if (blockquoteCount > 0 && hasCite) {
    efScore += 2
  } else if (blockquoteCount > 0) {
    efScore += 1
  }
  
  // 8. Tables with structure (2 pts)
  const hasTableHead = $('table thead').length > 0 || $('table th').length > 0
  if (hasTableHead) {
    efScore += 2
  }
  
  // Cap at 25
  efScore = Math.min(25, efScore)
  
  // ===== BOT ACCESSIBILITY (25 pts) =====
  let baScore = 0
  const baIssues: string[] = []
  
  // 1. Per-bot AI robots.txt analysis (8 pts)
  const aiBots = ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'anthropic-ai', 'PerplexityBot', 'Google-Extended']
  const blockedBots: string[] = []
  const allowedBots: string[] = []
  
  if (robotsTxt) {
    // Parse robots.txt for each AI bot
    aiBots.forEach(bot => {
      // Check for User-agent: BotName followed by Disallow: /
      const botSection = new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?(?=User-agent:|$)`, 'i')
      const match = robotsTxt.match(botSection)
      
      if (match) {
        const section = match[0]
        if (/Disallow:\s*\/\s*$/m.test(section)) {
          blockedBots.push(bot)
        } else {
          allowedBots.push(bot)
        }
      } else {
        // Check global User-agent: * rules
        const globalSection = robotsTxt.match(/User-agent:\s*\*[\s\S]*?(?=User-agent:|$)/i)
        if (globalSection && /Disallow:\s*\/\s*$/m.test(globalSection[0])) {
          blockedBots.push(bot)
        } else {
          allowedBots.push(bot)
        }
      }
    })
    
    const blockedRatio = blockedBots.length / aiBots.length
    if (blockedRatio === 0) {
      baScore += 8  // All bots allowed
    } else if (blockedRatio < 0.5) {
      baScore += 5  // Less than half blocked
      baIssues.push(`bots_partially_blocked:${blockedBots.join(',')}`)
    } else {
      baScore += 2  // Most bots blocked
      baIssues.push(`bots_mostly_blocked:${blockedBots.join(',')}`)
    }
  } else {
    baScore += 6  // No robots.txt = assume allowed (but not ideal)
    baIssues.push('no_robots_txt')
  }
  
  // 2. llms.txt presence (4 pts)
  if (llmsTxt) {
    baScore += 4
  } else {
    baIssues.push('no_llms_txt')
  }
  
  // 3. noindex/nofollow detection (4 pts)
  const metaRobots = $('meta[name="robots"]').attr('content')?.toLowerCase() || ''
  const hasNoindex = metaRobots.includes('noindex')
  const hasNofollow = metaRobots.includes('nofollow')
  const xRobotsTag = $('meta[name="X-Robots-Tag"]').attr('content')?.toLowerCase() || ''
  const hasXNoindex = xRobotsTag.includes('noindex')
  
  if (!hasNoindex && !hasXNoindex) {
    baScore += 4
  } else {
    baIssues.push('has_noindex')
  }
  if (hasNofollow) {
    baIssues.push('has_nofollow')
  }
  
  // 4. CSR detection - check for signs of client-side rendering (5 pts)
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
  const hasReactRoot = $('#root').length > 0 || $('#__next').length > 0 || $('#app').length > 0
  const hasVeryLittleContent = bodyText.length < 200
  const hasNoscriptWarning = $('noscript').text().toLowerCase().includes('javascript')
  const scriptCount = $('script').length
  const contentRatio = bodyText.length / (html.length || 1)
  
  let csrScore = 5
  const csrSignals: string[] = []
  
  if (hasVeryLittleContent && hasReactRoot) {
    csrScore = 0
    csrSignals.push('likely_csr')
  } else if (hasVeryLittleContent) {
    csrScore = 2
    csrSignals.push('low_content')
  } else if (contentRatio < 0.05 && scriptCount > 10) {
    csrScore = 3
    csrSignals.push('heavy_js')
  }
  
  baScore += csrScore
  if (csrSignals.length > 0) {
    baIssues.push(`csr_detected:${csrSignals.join(',')}`)
  }
  
  // 5. Load time check (penalty if too slow)
  // AI bots typically timeout after 5-10 seconds
  if (loadTimeMs > 5000) {
    baIssues.push(`slow_load:${loadTimeMs}`)
    baScore -= 3  // Penalty for slow load
  } else if (loadTimeMs > 3000) {
    baIssues.push(`moderate_load:${loadTimeMs}`)
    baScore -= 1
  }
  
  // 6. Image alt text (4 pts)
  const images = $('img')
  let imagesWithAlt = 0
  images.each((i, img) => {
    if ($(img).attr('alt')?.trim()) imagesWithAlt++
  })
  
  if (images.length > 0) {
    const altRatio = imagesWithAlt / images.length
    if (altRatio >= 0.9) baScore += 4
    else if (altRatio >= 0.7) baScore += 3
    else if (altRatio >= 0.5) baScore += 2
    else baScore += 1
    
    if (altRatio < 0.8) {
      baIssues.push(`missing_alt:${images.length - imagesWithAlt}`)
    }
  } else {
    baScore += 4  // No images = no issue
  }
  
  // Cap at 25
  baScore = Math.min(25, baScore)
  
  const totalScore = mrScore + sdScore + efScore + baScore
  
  // Generate recommendations (in English)
  const recommendations: any[] = []
  
  // Machine Readability recommendations based on mrIssues
  if (mrIssues.includes('missing_lang')) {
    recommendations.push({
      category: 'Machine Readability',
      priority: 'high',
      action: 'Add lang attribute to <html> tag (e.g., <html lang="en">)'
    })
  }
  
  if (mrIssues.includes('no_h1')) {
    recommendations.push({
      category: 'Machine Readability',
      priority: 'high',
      action: 'Add a unique H1 heading to this page'
    })
  } else if (mrIssues.includes('multiple_h1')) {
    recommendations.push({
      category: 'Machine Readability',
      priority: 'high',
      action: `Fix: only one H1 per page is recommended (found ${h1Count})`
    })
  }
  
  if (mrIssues.includes('heading_hierarchy_broken')) {
    recommendations.push({
      category: 'Machine Readability',
      priority: 'high',
      action: 'Fix heading hierarchy: use H1→H2→H3 in order, don\'t skip levels'
    })
  }
  
  if (mrIssues.includes('too_many_divs')) {
    recommendations.push({
      category: 'Machine Readability',
      priority: 'medium',
      action: `Replace some <div> with semantic tags (article, section, aside). Current ratio: ${Math.round(semanticRatio * 100)}% semantic`
    })
  }
  
  if (mrIssues.some(i => i.startsWith('missing_semantic:'))) {
    const missing = mrIssues.find(i => i.startsWith('missing_semantic:'))?.split(':')[1]
    recommendations.push({
      category: 'Machine Readability',
      priority: 'medium',
      action: `Add semantic HTML5 tags: <${missing?.split(',').join('>, <')}>`
    })
  }
  
  if (mrIssues.includes('few_landmarks')) {
    recommendations.push({
      category: 'Machine Readability',
      priority: 'low',
      action: 'Add ARIA landmarks or use semantic elements (header, nav, main, footer, aside)'
    })
  }
  
  // Structured Data recommendations based on sdIssues
  if (sdIssues.includes('no_jsonld')) {
    recommendations.push({
      category: 'Structured Data',
      priority: 'high',
      action: 'Add JSON-LD structured data with @context and @type (Organization, Article, FAQPage)'
    })
  }
  
  if (sdIssues.includes('jsonld_parse_error')) {
    recommendations.push({
      category: 'Structured Data',
      priority: 'high',
      action: 'Fix JSON-LD syntax error: validate your structured data at schema.org validator'
    })
  }
  
  if (sdIssues.includes('jsonld_no_context')) {
    recommendations.push({
      category: 'Structured Data',
      priority: 'high',
      action: 'Add @context: "https://schema.org" to your JSON-LD for proper validation'
    })
  }
  
  if (sdIssues.includes('no_recommended_schemas')) {
    recommendations.push({
      category: 'Structured Data',
      priority: 'medium',
      action: 'Add GEO-recommended schemas: Organization, Article, FAQPage, or HowTo'
    })
  }
  
  if (sdIssues.includes('no_opengraph')) {
    recommendations.push({
      category: 'Structured Data',
      priority: 'medium',
      action: 'Add Open Graph meta tags (og:title, og:description, og:image, og:type)'
    })
  }
  
  if (sdIssues.includes('no_twitter_cards')) {
    recommendations.push({
      category: 'Structured Data',
      priority: 'low',
      action: 'Add Twitter Card meta tags (twitter:card, twitter:title, twitter:description)'
    })
  }
  
  // Extraction Format recommendations based on efIssues
  if (efIssues.includes('no_meta_desc')) {
    recommendations.push({
      category: 'Extraction Format',
      priority: 'high',
      action: 'Add a meta description (120-160 characters) for AI snippet extraction'
    })
  } else if (efIssues.some(i => i.startsWith('meta_desc_short:'))) {
    const len = efIssues.find(i => i.startsWith('meta_desc_short:'))?.split(':')[1]
    recommendations.push({
      category: 'Extraction Format',
      priority: 'medium',
      action: `Optimize meta description length (currently ${len} chars, ideal: 120-160)`
    })
  }
  
  if (efIssues.includes('no_canonical')) {
    recommendations.push({
      category: 'Extraction Format',
      priority: 'high',
      action: 'Add <link rel="canonical" href="..."> to specify the preferred URL'
    })
  }
  
  if (efIssues.includes('no_faq')) {
    recommendations.push({
      category: 'Extraction Format',
      priority: 'medium',
      action: 'Add FAQ section using <details>/<summary> for AI-friendly Q&A extraction'
    })
  } else if (efIssues.includes('faq_not_semantic')) {
    recommendations.push({
      category: 'Extraction Format',
      priority: 'low',
      action: 'Convert FAQ to semantic <details>/<summary> elements for better AI parsing'
    })
  }
  
  // Suggest definition lists for glossaries/terms
  if ($('dl').length === 0 && ($('body').text().toLowerCase().includes('definition') || $('body').text().toLowerCase().includes('glossary'))) {
    recommendations.push({
      category: 'Extraction Format',
      priority: 'low',
      action: 'Use <dl>/<dt>/<dd> for definitions and glossary terms'
    })
  }
  
  // Suggest HowTo schema if steps detected but no schema
  if (!schemaTypes.includes('HowTo') && ($('[class*="step"]').length >= 2 || $('ol li').length >= 3)) {
    recommendations.push({
      category: 'Extraction Format',
      priority: 'low',
      action: 'Add HowTo schema markup for your step-by-step instructions'
    })
  }
  
  // Suggest ordered lists if none exist (for how-to/step content)
  if ($('ol li').length < 3) {
    recommendations.push({
      category: 'Extraction Format',
      priority: 'low',
      action: 'Add numbered lists (<ol><li>) for step-by-step instructions — AI loves structured steps'
    })
  }
  
  // Suggest tables if content could benefit
  if ($('table thead').length === 0 && $('table th').length === 0) {
    recommendations.push({
      category: 'Extraction Format',
      priority: 'low',
      action: 'Use <table> with <thead>/<th> for comparison data — helps AI extract structured info'
    })
  }
  
  // Bot Accessibility recommendations based on baIssues
  if (baIssues.some(i => i.startsWith('bots_mostly_blocked:'))) {
    const blocked = baIssues.find(i => i.startsWith('bots_mostly_blocked:'))?.split(':')[1]
    recommendations.push({
      category: 'Bot Accessibility',
      priority: 'high',
      action: `Unblock AI bots in robots.txt: ${blocked?.split(',').slice(0, 3).join(', ')} are blocked`
    })
  } else if (baIssues.some(i => i.startsWith('bots_partially_blocked:'))) {
    const blocked = baIssues.find(i => i.startsWith('bots_partially_blocked:'))?.split(':')[1]
    recommendations.push({
      category: 'Bot Accessibility',
      priority: 'medium',
      action: `Some AI bots blocked in robots.txt: ${blocked}`
    })
  }
  
  if (baIssues.includes('has_noindex')) {
    recommendations.push({
      category: 'Bot Accessibility',
      priority: 'high',
      action: 'Remove noindex meta tag - this prevents AI bots from indexing your content'
    })
  }
  
  if (baIssues.includes('has_nofollow')) {
    recommendations.push({
      category: 'Bot Accessibility',
      priority: 'medium',
      action: 'Consider removing nofollow - it may limit how AI discovers your other pages'
    })
  }
  
  if (baIssues.some(i => i.startsWith('csr_detected:'))) {
    const signals = baIssues.find(i => i.startsWith('csr_detected:'))?.split(':')[1]
    if (signals?.includes('likely_csr')) {
      recommendations.push({
        category: 'Bot Accessibility',
        priority: 'high',
        action: 'Your site appears to use client-side rendering (CSR) - AI bots may not see your content. Consider SSR/SSG.'
      })
    } else if (signals?.includes('low_content')) {
      recommendations.push({
        category: 'Bot Accessibility',
        priority: 'medium',
        action: 'Very little text content detected in HTML - ensure content is server-rendered'
      })
    }
  }
  
  if (baIssues.includes('no_llms_txt')) {
    recommendations.push({
      category: 'Bot Accessibility',
      priority: 'low',
      action: 'Create an llms.txt file to give AI crawlers instructions about your site'
    })
  }
  
  if (baIssues.some(i => i.startsWith('missing_alt:'))) {
    const missing = baIssues.find(i => i.startsWith('missing_alt:'))?.split(':')[1]
    recommendations.push({
      category: 'Bot Accessibility',
      priority: 'medium',
      action: `Add alt text to ${missing} image${parseInt(missing || '0') > 1 ? 's' : ''} for better AI understanding`
    })
  }
  
  if (baIssues.some(i => i.startsWith('slow_load:'))) {
    const time = baIssues.find(i => i.startsWith('slow_load:'))?.split(':')[1]
    recommendations.push({
      category: 'Bot Accessibility',
      priority: 'high',
      action: `Page loads too slowly (${Math.round(parseInt(time || '0') / 1000)}s) - AI bots timeout after 5-10s. Optimize performance.`
    })
  } else if (baIssues.some(i => i.startsWith('moderate_load:'))) {
    const time = baIssues.find(i => i.startsWith('moderate_load:'))?.split(':')[1]
    recommendations.push({
      category: 'Bot Accessibility',
      priority: 'medium',
      action: `Page load time is moderate (${Math.round(parseInt(time || '0') / 1000)}s) - consider optimizing for faster AI crawling`
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
      hasFaq: hasDetailsSummary || hasFaqSchema || hasFaqClass,
      hasCanonical: !!canonicalUrl,
      hasOpenGraph: ogTags.length >= 3,
      hasTwitterCards: twTags.length >= 2,
      hasLlmsTxt: !!llmsTxt,
      blockedBots,
      allowedBots,
      hasNoindex,
      hasNofollow,
      csrDetected: csrSignals.length > 0,
      loadTimeMs
    }
  }
}

async function analyzePage(url: string, rootUrl: string) {
  try {
    const [pageResult, robotsTxt, llmsTxt] = await Promise.all([
      fetchUrlWithTiming(url),
      fetchUrl(`${rootUrl}/robots.txt`).catch(() => null),
      fetchUrl(`${rootUrl}/llms.txt`).catch(() => null)
    ])
    
    const { content: html, loadTimeMs } = pageResult
    const $ = cheerio.load(html)
    const analysis = analyzePageContent($, html, robotsTxt, llmsTxt, loadTimeMs)
    
    return { url, success: true, loadTimeMs, ...analysis }
  } catch (error: any) {
    console.error(`[GEO] Error analyzing ${url}:`, error.message, error.stack)
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
    
    // Use sitemap if found, otherwise fallback to crawling homepage links
    let pageUrls: string[]
    let discoveryMethod: 'sitemap' | 'crawl'
    
    if (sitemap.found) {
      pageUrls = sitemap.urls
      discoveryMethod = 'sitemap'
    } else {
      // Fallback: crawl homepage for internal links
      pageUrls = await crawlHomepageLinks(rootUrl)
      discoveryMethod = 'crawl'
    }
    
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
        pagesSuccessful: successful.length,
        discoveryMethod
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
        loadTimeMs: (p as any).loadTimeMs || 0,
        categories: p.categories,
        recommendations: p.recommendations?.slice(0, 5) || [],
        details: (p as any).details
      })),
      problemPages,
      actionPlan
    })
    
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
