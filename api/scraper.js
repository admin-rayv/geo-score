/**
 * GEO Score Scraper
 * Fetch une URL et ses fichiers associés (robots.txt, llms.txt)
 */

import fetch from 'node-fetch';
import { analyzeGEO } from './analyzer.js';

const DEFAULT_USER_AGENT = 'GEOScoreBot/1.0 (+https://geoscore.ca)';
const TIMEOUT = 15000; // 15 secondes

/**
 * Récupère le contenu d'une URL
 */
async function fetchUrl(url, userAgent = DEFAULT_USER_AGENT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-CA,fr;q=0.9,en;q=0.8'
      },
      signal: controller.signal,
      redirect: 'follow'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Timeout: la requête a pris trop de temps');
    }
    throw error;
  }
}

/**
 * Extrait le domaine racine d'une URL
 */
function getRootUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (e) {
    throw new Error('URL invalide');
  }
}

/**
 * Récupère robots.txt (silencieux si 404)
 */
async function fetchRobotsTxt(rootUrl) {
  try {
    const content = await fetchUrl(`${rootUrl}/robots.txt`);
    return content;
  } catch (e) {
    return null;
  }
}

/**
 * Récupère llms.txt (silencieux si 404)
 */
async function fetchLlmsTxt(rootUrl) {
  try {
    const content = await fetchUrl(`${rootUrl}/llms.txt`);
    return content;
  } catch (e) {
    // Essayer aussi .well-known/llms.txt
    try {
      const content = await fetchUrl(`${rootUrl}/.well-known/llms.txt`);
      return content;
    } catch (e2) {
      return null;
    }
  }
}

/**
 * Analyse complète d'un site
 * @param {string} url - URL à analyser
 * @returns {Object} Résultat complet de l'analyse
 */
export async function scrapeAndAnalyze(url) {
  // Valider et normaliser l'URL
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }
  
  const rootUrl = getRootUrl(normalizedUrl);
  const startTime = Date.now();
  
  try {
    // Fetch en parallèle pour la performance
    const [html, robotsTxt, llmsTxt] = await Promise.all([
      fetchUrl(normalizedUrl),
      fetchRobotsTxt(rootUrl),
      fetchLlmsTxt(rootUrl)
    ]);
    
    // Analyser
    const analysis = analyzeGEO(html, robotsTxt, llmsTxt);
    
    const endTime = Date.now();
    
    return {
      success: true,
      url: normalizedUrl,
      rootUrl,
      analyzedAt: new Date().toISOString(),
      durationMs: endTime - startTime,
      ...analysis,
      meta: {
        hasRobotsTxt: robotsTxt !== null,
        hasLlmsTxt: llmsTxt !== null,
        htmlSize: html.length
      }
    };
  } catch (error) {
    return {
      success: false,
      url: normalizedUrl,
      error: error.message,
      analyzedAt: new Date().toISOString()
    };
  }
}

/**
 * Génère un résumé formaté pour affichage
 */
export function formatSummary(result) {
  if (!result.success) {
    return `❌ Erreur: ${result.error}`;
  }
  
  const scoreEmoji = result.score >= 75 ? '🟢' : result.score >= 50 ? '🟡' : '🔴';
  
  let summary = `
${scoreEmoji} **Score GEO: ${result.score}/100**

📊 **Détails par catégorie:**
• Lisibilité Machine: ${result.categories.machineReadability.score}/25
• Données Structurées: ${result.categories.structuredData.score}/25
• Formatage Extraction: ${result.categories.extractionFormat.score}/25
• Accessibilité Bots: ${result.categories.botAccessibility.score}/25

🎯 **Top 3 Recommandations:**
`;
  
  result.recommendations.slice(0, 3).forEach((rec, i) => {
    const priorityEmoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
    summary += `${i + 1}. ${priorityEmoji} [${rec.category}] ${rec.action}\n`;
  });
  
  return summary.trim();
}

export default scrapeAndAnalyze;
