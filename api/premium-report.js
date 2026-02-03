/**
 * GEO Score - Premium Report Generator
 * 
 * Analyse multi-pages via sitemap.xml
 * + Recommandations par page
 * + Plan d'action priorisé
 * + Simulation de citation IA
 */

import * as cheerio from 'cheerio';
import { analyzeGEO } from './analyzer.js';

const DEFAULT_USER_AGENT = 'GEOScoreBot/1.0 (+https://geoscore.com)';
const TIMEOUT = 15000;
const MAX_PAGES = 20; // Limite pour éviter les timeouts

/**
 * Fetch une URL avec timeout
 */
async function fetchUrl(url, timeout = TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow'
    });
    
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Extrait le domaine racine d'une URL
 */
function getRootUrl(url) {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}`;
}

/**
 * Parse le sitemap.xml et extrait les URLs
 */
async function parseSitemap(rootUrl) {
  const sitemapUrls = [
    `${rootUrl}/sitemap.xml`,
    `${rootUrl}/sitemap_index.xml`,
    `${rootUrl}/sitemap/sitemap.xml`,
  ];
  
  let urls = [];
  
  for (const sitemapUrl of sitemapUrls) {
    try {
      const content = await fetchUrl(sitemapUrl, 10000);
      const $ = cheerio.load(content, { xmlMode: true });
      
      // Sitemap index (contient d'autres sitemaps)
      const sitemapLocs = $('sitemap > loc').map((i, el) => $(el).text()).get();
      
      if (sitemapLocs.length > 0) {
        // C'est un sitemap index, on parse le premier sub-sitemap
        for (const subSitemapUrl of sitemapLocs.slice(0, 2)) {
          try {
            const subContent = await fetchUrl(subSitemapUrl, 10000);
            const $sub = cheerio.load(subContent, { xmlMode: true });
            const subUrls = $sub('url > loc').map((i, el) => $sub(el).text()).get();
            urls = urls.concat(subUrls);
          } catch (e) {
            // Ignore sub-sitemap errors
          }
        }
      } else {
        // Sitemap standard
        urls = $('url > loc').map((i, el) => $(el).text()).get();
      }
      
      if (urls.length > 0) break;
    } catch (e) {
      // Try next sitemap URL
    }
  }
  
  // Dédupliquer et limiter
  urls = [...new Set(urls)].slice(0, MAX_PAGES);
  
  // Si pas de sitemap, essayer de crawler la homepage pour trouver des liens
  if (urls.length === 0) {
    urls = await crawlHomepageLinks(rootUrl);
  }
  
  return urls;
}

/**
 * Fallback: crawl la homepage pour trouver des liens internes
 */
async function crawlHomepageLinks(rootUrl) {
  try {
    const html = await fetchUrl(rootUrl);
    const $ = cheerio.load(html);
    const links = new Set([rootUrl]);
    
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const fullUrl = new URL(href, rootUrl);
          if (fullUrl.origin === new URL(rootUrl).origin) {
            // Même domaine, ajouter
            const cleanUrl = `${fullUrl.origin}${fullUrl.pathname}`;
            links.add(cleanUrl);
          }
        } catch (e) {}
      }
    });
    
    return [...links].slice(0, MAX_PAGES);
  } catch (e) {
    return [rootUrl];
  }
}

/**
 * Analyse une seule page
 */
async function analyzePage(url, rootUrl) {
  try {
    const [html, robotsTxt, llmsTxt] = await Promise.all([
      fetchUrl(url),
      fetchUrl(`${rootUrl}/robots.txt`).catch(() => null),
      fetchUrl(`${rootUrl}/llms.txt`).catch(() => null)
    ]);
    
    const analysis = analyzeGEO(html, robotsTxt, llmsTxt);
    
    return {
      url,
      success: true,
      ...analysis
    };
  } catch (error) {
    return {
      url,
      success: false,
      error: error.message,
      score: 0,
      categories: null,
      recommendations: []
    };
  }
}

/**
 * Calcule le plan d'action priorisé basé sur effort/impact
 */
function generatePrioritizedPlan(allRecommendations) {
  // Définir effort et impact pour chaque type de recommandation
  const actionMetrics = {
    // High impact, low effort (Quick Wins)
    'Meta description manquante': { effort: 1, impact: 3, time: '5 min' },
    'Meta description': { effort: 1, impact: 3, time: '5 min' },
    'Aucun H1': { effort: 1, impact: 3, time: '5 min' },
    'Multiple H1': { effort: 1, impact: 3, time: '10 min' },
    
    // High impact, medium effort
    'Aucun JSON-LD trouvé': { effort: 2, impact: 3, time: '30 min' },
    'Ajouter des schemas JSON-LD': { effort: 2, impact: 3, time: '30 min' },
    'Bots IA bloqués': { effort: 1, impact: 3, time: '10 min' },
    'Autoriser les bots IA': { effort: 1, impact: 3, time: '10 min' },
    
    // Medium impact, low effort
    'Fichier llms.txt': { effort: 1, impact: 2, time: '15 min' },
    'Aucune FAQ détectée': { effort: 2, impact: 2, time: '45 min' },
    'image(s) sans alt': { effort: 1, impact: 2, time: '20 min' },
    
    // Medium impact, medium effort
    'Éléments sémantiques manquants': { effort: 2, impact: 2, time: '1-2h' },
    'Remplacer les <div>': { effort: 2, impact: 2, time: '1-2h' },
    'Enrichir avec FAQPage': { effort: 2, impact: 2, time: '1h' },
    
    // Lower priority
    'Site en rendu côté client': { effort: 3, impact: 2, time: '4h+' },
    'SSR ou pre-rendering': { effort: 3, impact: 2, time: '4h+' },
    'Ratio éléments sémantiques': { effort: 2, impact: 1, time: '1-2h' },
    'attributs ARIA': { effort: 2, impact: 1, time: '1h' },
  };
  
  // Catégoriser les recommandations
  const quickWins = [];
  const mediumProjects = [];
  const majorProjects = [];
  
  // Dédupliquer les recommandations par action
  const seenActions = new Set();
  
  allRecommendations.forEach(rec => {
    if (seenActions.has(rec.action)) return;
    seenActions.add(rec.action);
    
    // Trouver les métriques correspondantes
    let metrics = { effort: 2, impact: 2, time: '30 min' }; // défaut
    for (const [key, value] of Object.entries(actionMetrics)) {
      if (rec.action.includes(key) || rec.issue.includes(key)) {
        metrics = value;
        break;
      }
    }
    
    const item = {
      ...rec,
      effort: metrics.effort,
      impact: metrics.impact,
      estimatedTime: metrics.time,
      priorityScore: metrics.impact * 2 - metrics.effort // Plus c'est haut, plus c'est prioritaire
    };
    
    if (metrics.effort === 1 && metrics.impact >= 2) {
      quickWins.push(item);
    } else if (metrics.effort <= 2 && metrics.impact >= 2) {
      mediumProjects.push(item);
    } else {
      majorProjects.push(item);
    }
  });
  
  // Trier chaque catégorie par score de priorité
  const sortByPriority = (a, b) => b.priorityScore - a.priorityScore;
  quickWins.sort(sortByPriority);
  mediumProjects.sort(sortByPriority);
  majorProjects.sort(sortByPriority);
  
  return {
    quickWins: quickWins.slice(0, 5),
    mediumProjects: mediumProjects.slice(0, 5),
    majorProjects: majorProjects.slice(0, 3)
  };
}

/**
 * Estime le score potentiel après implémentation des recommandations
 */
function estimatePotentialScore(currentScore, recommendations) {
  let potentialGain = 0;
  const seenCategories = new Set();
  
  recommendations.forEach(rec => {
    const key = `${rec.category}-${rec.priority}`;
    if (seenCategories.has(key)) return;
    seenCategories.add(key);
    
    if (rec.priority === 'high') potentialGain += 8;
    else if (rec.priority === 'medium') potentialGain += 4;
    else potentialGain += 2;
  });
  
  return Math.min(100, currentScore + potentialGain);
}

/**
 * Génère le rapport premium complet
 */
export async function generatePremiumReport(inputUrl) {
  // Normaliser l'URL
  let url = inputUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  const rootUrl = getRootUrl(url);
  const startTime = Date.now();
  
  console.log(`🔍 Starting premium analysis for: ${rootUrl}`);
  
  // 1. Récupérer les URLs depuis sitemap
  console.log('📄 Fetching sitemap...');
  const pageUrls = await parseSitemap(rootUrl);
  console.log(`   Found ${pageUrls.length} pages to analyze`);
  
  // 2. Analyser chaque page
  console.log('🔬 Analyzing pages...');
  const pageResults = [];
  
  for (let i = 0; i < pageUrls.length; i++) {
    const pageUrl = pageUrls[i];
    console.log(`   [${i + 1}/${pageUrls.length}] ${pageUrl}`);
    
    const result = await analyzePage(pageUrl, rootUrl);
    pageResults.push(result);
    
    // Petit délai pour éviter de surcharger le serveur
    if (i < pageUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // 3. Calculer les statistiques globales
  const successfulPages = pageResults.filter(p => p.success);
  const averageScore = successfulPages.length > 0
    ? Math.round(successfulPages.reduce((sum, p) => sum + p.score, 0) / successfulPages.length)
    : 0;
  
  // 4. Agréger toutes les recommandations
  const allRecommendations = [];
  pageResults.forEach(page => {
    if (page.recommendations) {
      page.recommendations.forEach(rec => {
        allRecommendations.push({
          ...rec,
          pageUrl: page.url
        });
      });
    }
  });
  
  // 5. Générer le plan d'action priorisé
  const actionPlan = generatePrioritizedPlan(allRecommendations);
  
  // 6. Identifier les pages problématiques
  const problemPages = successfulPages
    .filter(p => p.score < 50)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);
  
  // 7. Identifier les recommandations globales (qui s'appliquent à plusieurs pages)
  const recCounts = {};
  allRecommendations.forEach(rec => {
    const key = rec.action;
    recCounts[key] = (recCounts[key] || 0) + 1;
  });
  
  const globalRecommendations = [...new Set(allRecommendations.map(r => r.action))]
    .filter(action => recCounts[action] >= Math.ceil(successfulPages.length / 2))
    .map(action => {
      const rec = allRecommendations.find(r => r.action === action);
      return {
        ...rec,
        affectedPages: recCounts[action]
      };
    })
    .slice(0, 5);
  
  // 8. Estimer le score potentiel
  const potentialScore = estimatePotentialScore(averageScore, allRecommendations);
  
  const endTime = Date.now();
  
  return {
    success: true,
    reportType: 'premium',
    generatedAt: new Date().toISOString(),
    analysisTime: `${Math.round((endTime - startTime) / 1000)}s`,
    
    // Infos du site
    site: {
      url: rootUrl,
      pagesAnalyzed: pageResults.length,
      pagesSuccessful: successfulPages.length,
      pagesFailed: pageResults.length - successfulPages.length
    },
    
    // Score global
    summary: {
      averageScore,
      potentialScore,
      possibleGain: potentialScore - averageScore,
      lowestScore: successfulPages.length > 0 ? Math.min(...successfulPages.map(p => p.score)) : 0,
      highestScore: successfulPages.length > 0 ? Math.max(...successfulPages.map(p => p.score)) : 0
    },
    
    // Résultats par page
    pages: pageResults.map(p => ({
      url: p.url,
      success: p.success,
      score: p.score,
      categories: p.categories ? {
        machineReadability: p.categories.machineReadability.score,
        structuredData: p.categories.structuredData.score,
        extractionFormat: p.categories.extractionFormat.score,
        botAccessibility: p.categories.botAccessibility.score
      } : null,
      recommendations: p.recommendations || [],
      error: p.error
    })),
    
    // Pages problématiques
    problemPages: problemPages.map(p => ({
      url: p.url,
      score: p.score,
      mainIssues: p.recommendations.slice(0, 2).map(r => r.action)
    })),
    
    // Recommandations globales
    globalRecommendations,
    
    // Plan d'action priorisé
    actionPlan
  };
}

export default generatePremiumReport;
