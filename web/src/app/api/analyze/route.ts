import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

// Known AI Bots
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot',
  'anthropic-ai', 'Claude-Web', 'PerplexityBot', 'Amazonbot',
  'Google-Extended', 'GoogleOther', 'cohere-ai', 'Bytespider'
]

const IMPORTANT_SCHEMAS = [
  'Organization', 'LocalBusiness', 'Person', 'Service',
  'Product', 'FAQPage', 'HowTo', 'Article', 'WebPage', 'BreadcrumbList'
]

const TIMEOUT = 15000

async function fetchUrl(url: string): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GEOScoreBot/1.0 (+https://geoscore.com)',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') throw new Error('Timeout')
    throw error
  }
}

function getRootUrl(url: string): string {
  const parsed = new URL(url)
  return `${parsed.protocol}//${parsed.host}`
}

async function fetchOptional(url: string): Promise<string | null> {
  try {
    return await fetchUrl(url)
  } catch {
    return null
  }
}

// Analysis functions
function analyzeMachineReadability($: cheerio.CheerioAPI) {
  const details: any = {
    semanticElements: { score: 0, max: 8, found: [], missing: [] },
    headingHierarchy: { score: 0, max: 7, issues: [] },
    divRatio: { score: 0, max: 5, ratio: 0 },
    ssrDetection: { score: 0, max: 5, isSSR: false }
  }
  
  const semanticTags = ['article', 'section', 'aside', 'nav', 'header', 'footer', 'main', 'details']
  semanticTags.forEach(tag => {
    if ($(tag).length > 0) details.semanticElements.found.push(tag)
    else details.semanticElements.missing.push(tag)
  })
  details.semanticElements.score = Math.min(8, details.semanticElements.found.length)
  
  const h1Count = $('h1').length
  const h2Count = $('h2').length
  const h3Count = $('h3').length
  
  if (h1Count === 1) details.headingHierarchy.score += 3
  else if (h1Count === 0) details.headingHierarchy.issues.push('No H1 found')
  else details.headingHierarchy.issues.push(`Multiple H1 tags (${h1Count})`)
  
  if (h2Count > 0) details.headingHierarchy.score += 2
  if (h3Count > 0 && h2Count > 0) details.headingHierarchy.score += 2
  
  const divCount = $('div').length
  const semanticCount = $('article, section, aside, nav, header, footer, main').length
  const totalContainers = divCount + semanticCount
  
  if (totalContainers > 0) {
    details.divRatio.ratio = semanticCount / totalContainers
    details.divRatio.score = Math.round(details.divRatio.ratio * 5)
  }
  
  const textContent = $('body').text().replace(/\s+/g, ' ').trim()
  const hasSubstantialContent = textContent.length > 500
  const hasEmptyRoot = $('#root:empty, #__next:empty, #app:empty').length > 0
  
  details.ssrDetection.isSSR = hasSubstantialContent && !hasEmptyRoot
  details.ssrDetection.score = details.ssrDetection.isSSR ? 5 : 0
  
  return {
    score: details.semanticElements.score + details.headingHierarchy.score + details.divRatio.score + details.ssrDetection.score,
    maxScore: 25,
    details
  }
}

function analyzeStructuredData($: cheerio.CheerioAPI, html: string) {
  const details: any = {
    jsonLdPresent: { score: 0, max: 10, found: false, schemas: [] },
    schemaTypes: { score: 0, max: 10, types: [] },
    schemaQuality: { score: 0, max: 5, completeness: 0 }
  }
  
  const jsonLdScripts = $('script[type="application/ld+json"]')
  
  if (jsonLdScripts.length > 0) {
    details.jsonLdPresent.found = true
    details.jsonLdPresent.score = 10
    
    jsonLdScripts.each((i, el) => {
      try {
        const content = $(el).html() || ''
        const data = JSON.parse(content)
        const schemas = Array.isArray(data) ? data : [data]
        
        schemas.forEach((schema: any) => {
          if (schema['@type']) {
            const types = Array.isArray(schema['@type']) ? schema['@type'] : [schema['@type']]
            types.forEach((type: string) => {
              if (!details.schemaTypes.types.includes(type)) {
                details.schemaTypes.types.push(type)
              }
            })
          }
          if (schema['@graph']) {
            schema['@graph'].forEach((item: any) => {
              if (item['@type'] && !details.schemaTypes.types.includes(item['@type'])) {
                details.schemaTypes.types.push(item['@type'])
              }
            })
          }
        })
      } catch {}
    })
    
    const importantFound = details.schemaTypes.types.filter((t: string) =>
      IMPORTANT_SCHEMAS.some(s => t.includes(s))
    )
    details.schemaTypes.score = Math.min(10, importantFound.length * 2)
    details.schemaQuality.completeness = details.schemaTypes.types.length > 3 ? 1 : details.schemaTypes.types.length / 3
    details.schemaQuality.score = Math.round(details.schemaQuality.completeness * 5)
  }
  
  if ($('[itemtype]').length > 0 && !details.jsonLdPresent.found) {
    details.jsonLdPresent.score = 5
  }
  
  return {
    score: details.jsonLdPresent.score + details.schemaTypes.score + details.schemaQuality.score,
    maxScore: 25,
    details
  }
}

function analyzeExtractionFormat($: cheerio.CheerioAPI) {
  const details: any = {
    faqDetected: { score: 0, max: 7, found: false, method: null },
    tables: { score: 0, max: 6, count: 0, semantic: 0 },
    orderedLists: { score: 0, max: 6, count: 0 },
    metaDescription: { score: 0, max: 6, present: false, length: 0 }
  }
  
  const detailsElements = $('details').length
  const faqSections = $('[class*="faq"], [id*="faq"], .accordion').length
  
  if (detailsElements > 0) {
    details.faqDetected.found = true
    details.faqDetected.method = 'details/summary'
    details.faqDetected.score = 7
  } else if (faqSections > 0) {
    details.faqDetected.found = true
    details.faqDetected.method = 'faq-section'
    details.faqDetected.score = 5
  }
  
  const tables = $('table')
  details.tables.count = tables.length
  tables.each((i, table) => {
    if ($(table).find('thead, th, caption').length > 0) details.tables.semantic++
  })
  if (details.tables.count > 0) {
    details.tables.score = Math.round((details.tables.semantic / details.tables.count) * 6)
  }
  
  details.orderedLists.count = $('ol').length
  if (details.orderedLists.count > 0) {
    details.orderedLists.score = Math.min(6, details.orderedLists.count * 2)
  }
  
  const metaDesc = $('meta[name="description"]').attr('content')
  if (metaDesc) {
    details.metaDescription.present = true
    details.metaDescription.length = metaDesc.length
    if (metaDesc.length >= 120 && metaDesc.length <= 160) details.metaDescription.score = 6
    else if (metaDesc.length >= 80 && metaDesc.length <= 200) details.metaDescription.score = 4
    else if (metaDesc.length > 0) details.metaDescription.score = 2
  }
  
  return {
    score: details.faqDetected.score + details.tables.score + details.orderedLists.score + details.metaDescription.score,
    maxScore: 25,
    details
  }
}

function analyzeBotAccessibility($: cheerio.CheerioAPI, robotsTxt: string | null, llmsTxt: string | null) {
  const details: any = {
    robotsTxt: { score: 0, max: 8, analyzed: false, aiBotsAllowed: [], aiBotsBlocked: [] },
    llmsTxt: { score: 0, max: 7, present: false },
    altText: { score: 0, max: 5, total: 0, withAlt: 0 },
    ariaLabels: { score: 0, max: 5, count: 0 }
  }
  
  if (robotsTxt) {
    details.robotsTxt.analyzed = true
    AI_BOTS.forEach(bot => {
      const botRegex = new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?(?=User-agent:|$)`, 'i')
      const botMatch = robotsTxt.match(botRegex)
      const wildcardMatch = robotsTxt.match(/User-agent:\s*\*[\s\S]*?(?=User-agent:|$)/i)
      
      let isBlocked = false
      if (botMatch) {
        if (/Disallow:\s*\/\s*$/m.test(botMatch[0])) isBlocked = true
      } else if (wildcardMatch) {
        if (/Disallow:\s*\/\s*$/m.test(wildcardMatch[0])) isBlocked = true
      }
      
      if (isBlocked) details.robotsTxt.aiBotsBlocked.push(bot)
      else details.robotsTxt.aiBotsAllowed.push(bot)
    })
    details.robotsTxt.score = Math.round((details.robotsTxt.aiBotsAllowed.length / AI_BOTS.length) * 8)
  } else {
    details.robotsTxt.aiBotsAllowed = [...AI_BOTS]
    details.robotsTxt.score = 8
  }
  
  if (llmsTxt) {
    details.llmsTxt.present = true
    details.llmsTxt.score = 7
  }
  
  const images = $('img')
  details.altText.total = images.length
  images.each((i, img) => {
    const alt = $(img).attr('alt')
    if (alt && alt.trim().length > 0) details.altText.withAlt++
  })
  if (details.altText.total > 0) {
    details.altText.score = Math.round((details.altText.withAlt / details.altText.total) * 5)
  } else {
    details.altText.score = 5
  }
  
  details.ariaLabels.count = $('[aria-label], [aria-labelledby], [aria-describedby], [role]').length
  details.ariaLabels.score = Math.min(5, Math.round(details.ariaLabels.count / 5))
  
  return {
    score: details.robotsTxt.score + details.llmsTxt.score + details.altText.score + details.ariaLabels.score,
    maxScore: 25,
    details
  }
}

function generateRecommendations(categories: any) {
  const recommendations: any[] = []
  
  const mr = categories.machineReadability.details
  if (mr.semanticElements.missing.length > 3) {
    recommendations.push({
      category: 'Machine Readability',
      priority: 'high',
      issue: `Missing semantic elements: ${mr.semanticElements.missing.slice(0, 3).join(', ')}`,
      action: 'Replace <div> with semantic HTML5 tags (article, section, aside)'
    })
  }
  if (mr.headingHierarchy.issues.length > 0) {
    recommendations.push({
      category: 'Machine Readability',
      priority: 'high',
      issue: mr.headingHierarchy.issues[0],
      action: 'Fix heading hierarchy: one H1, followed by H2, then H3'
    })
  }
  if (!mr.ssrDetection.isSSR) {
    recommendations.push({
      category: 'Machine Readability',
      priority: 'medium',
      issue: 'Site uses client-side rendering (CSR)',
      action: 'Consider SSR or pre-rendering for better bot crawling'
    })
  }
  
  const sd = categories.structuredData.details
  if (!sd.jsonLdPresent.found) {
    recommendations.push({
      category: 'Structured Data',
      priority: 'high',
      issue: 'No JSON-LD found',
      action: 'Add JSON-LD schemas (Organization, FAQPage, etc.)'
    })
  } else if (sd.schemaTypes.types.length < 2) {
    recommendations.push({
      category: 'Structured Data',
      priority: 'medium',
      issue: `Only ${sd.schemaTypes.types.length} schema type(s) found`,
      action: 'Enrich with FAQPage, HowTo, BreadcrumbList'
    })
  }
  
  const ef = categories.extractionFormat.details
  if (!ef.faqDetected.found) {
    recommendations.push({
      category: 'Extraction Format',
      priority: 'medium',
      issue: 'No FAQ detected',
      action: 'Add FAQ with <details>/<summary> or FAQPage schema'
    })
  }
  if (!ef.metaDescription.present) {
    recommendations.push({
      category: 'Extraction Format',
      priority: 'high',
      issue: 'Missing meta description',
      action: 'Add meta description (120-160 characters)'
    })
  }
  
  const ba = categories.botAccessibility.details
  if (ba.robotsTxt.aiBotsBlocked.length > 0) {
    recommendations.push({
      category: 'Bot Accessibility',
      priority: 'high',
      issue: `AI bots blocked: ${ba.robotsTxt.aiBotsBlocked.slice(0, 3).join(', ')}`,
      action: 'Allow AI bots in robots.txt'
    })
  }
  if (!ba.llmsTxt.present) {
    recommendations.push({
      category: 'Bot Accessibility',
      priority: 'medium',
      issue: 'No llms.txt file found',
      action: 'Create an llms.txt file to guide AI crawlers'
    })
  }
  if (ba.altText.total > 0 && ba.altText.withAlt < ba.altText.total) {
    recommendations.push({
      category: 'Bot Accessibility',
      priority: 'medium',
      issue: `${ba.altText.total - ba.altText.withAlt} image(s) without alt text`,
      action: 'Add alt attributes to all images'
    })
  }
  
  // Additional recommendations for more content
  if (mr.semanticElements.missing.length > 0 && mr.semanticElements.missing.length <= 3) {
    recommendations.push({
      category: 'Machine Readability',
      priority: 'low',
      issue: `Semantic elements to add: ${mr.semanticElements.missing.join(', ')}`,
      action: 'Add missing HTML5 tags to improve structure'
    })
  }
  
  if (mr.divRatio.ratio < 0.3 && mr.divRatio.score < 5) {
    recommendations.push({
      category: 'Machine Readability',
      priority: 'low',
      issue: 'Low semantic-to-div ratio',
      action: 'Replace some <div> with semantic tags (article, section, nav)'
    })
  }
  
  if (ef.orderedLists.count === 0) {
    recommendations.push({
      category: 'Extraction Format',
      priority: 'low',
      issue: 'No ordered lists detected',
      action: 'Use <ol> for processes and steps (better AI extraction)'
    })
  }
  
  if (ba.ariaLabels.count < 5) {
    recommendations.push({
      category: 'Bot Accessibility',
      priority: 'low',
      issue: 'Few ARIA attributes detected',
      action: 'Add aria-label for better accessibility and AI understanding'
    })
  }
  
  // If still no recommendations (excellent site), add general suggestions
  if (recommendations.length === 0) {
    recommendations.push({
      category: 'Optimization',
      priority: 'low',
      issue: 'Site already well optimized',
      action: 'Add an llms.txt file for AI-specific instructions'
    })
    recommendations.push({
      category: 'Optimization',
      priority: 'low',
      issue: 'Continuous improvement',
      action: 'Enrich JSON-LD schemas with more types (HowTo, Article, Product)'
    })
    recommendations.push({
      category: 'Optimization',
      priority: 'low',
      issue: 'AI visibility',
      action: 'Add structured FAQ with FAQPage schema for AI featured snippets'
    })
  }
  
  const priorityOrder: any = { high: 0, medium: 1, low: 2 }
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  
  return recommendations
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ success: false, error: 'URL required' }, { status: 400 })
  }
  
  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl
  }
  
  try {
    const rootUrl = getRootUrl(normalizedUrl)
    
    const [html, robotsTxt, llmsTxt] = await Promise.all([
      fetchUrl(normalizedUrl),
      fetchOptional(`${rootUrl}/robots.txt`),
      fetchOptional(`${rootUrl}/llms.txt`)
    ])
    
    const $ = cheerio.load(html)
    
    const categories = {
      machineReadability: analyzeMachineReadability($),
      structuredData: analyzeStructuredData($, html),
      extractionFormat: analyzeExtractionFormat($),
      botAccessibility: analyzeBotAccessibility($, robotsTxt, llmsTxt)
    }
    
    const score = Math.round(
      categories.machineReadability.score +
      categories.structuredData.score +
      categories.extractionFormat.score +
      categories.botAccessibility.score
    )
    
    const recommendations = generateRecommendations(categories)
    
    return NextResponse.json({
      success: true,
      url: normalizedUrl,
      score,
      categories,
      recommendations,
      meta: {
        hasRobotsTxt: robotsTxt !== null,
        hasLlmsTxt: llmsTxt !== null
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      url: normalizedUrl,
      error: error.message || 'Error during analysis'
    }, { status: 500 })
  }
}
