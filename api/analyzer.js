/**
 * GEO Score Analyzer
 * Analyse un site web pour son optimisation GEO (Generative Engine Optimization)
 * 
 * 4 catégories, 25 points chacune = 100 points total
 */

import * as cheerio from 'cheerio';

// Bots IA connus
const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot', 
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'Claude-Web',
  'PerplexityBot',
  'Amazonbot',
  'Google-Extended',
  'GoogleOther',
  'cohere-ai',
  'Bytespider'
];

// Types Schema.org importants pour GEO
const IMPORTANT_SCHEMAS = [
  'Organization',
  'LocalBusiness',
  'Person',
  'Service',
  'Product',
  'FAQPage',
  'HowTo',
  'Article',
  'WebPage',
  'BreadcrumbList'
];

/**
 * Analyse complète d'une page
 * @param {string} html - Le HTML de la page
 * @param {string} robotsTxt - Contenu du robots.txt (optionnel)
 * @param {string} llmsTxt - Contenu du llms.txt (optionnel)
 * @returns {Object} Score et détails
 */
export function analyzeGEO(html, robotsTxt = null, llmsTxt = null) {
  const $ = cheerio.load(html);
  
  const results = {
    score: 0,
    categories: {
      machineReadability: analyzeMachineReadability($),
      structuredData: analyzeStructuredData($, html),
      extractionFormat: analyzeExtractionFormat($),
      botAccessibility: analyzeBotAccessibility($, robotsTxt, llmsTxt)
    },
    recommendations: []
  };
  
  // Calculer le score total
  results.score = Math.round(
    results.categories.machineReadability.score +
    results.categories.structuredData.score +
    results.categories.extractionFormat.score +
    results.categories.botAccessibility.score
  );
  
  // Générer les recommandations prioritaires
  results.recommendations = generateRecommendations(results.categories);
  
  return results;
}

/**
 * 1. LISIBILITÉ MACHINE (25 pts)
 */
function analyzeMachineReadability($) {
  const details = {
    semanticElements: { score: 0, max: 8, found: [], missing: [] },
    headingHierarchy: { score: 0, max: 7, issues: [] },
    divRatio: { score: 0, max: 5, ratio: 0 },
    ssrDetection: { score: 0, max: 5, isSSR: false }
  };
  
  // Éléments sémantiques (8 pts)
  const semanticTags = ['article', 'section', 'aside', 'nav', 'header', 'footer', 'main', 'details'];
  semanticTags.forEach(tag => {
    if ($(tag).length > 0) {
      details.semanticElements.found.push(tag);
    } else {
      details.semanticElements.missing.push(tag);
    }
  });
  details.semanticElements.score = Math.min(8, details.semanticElements.found.length);
  
  // Hiérarchie des titres (7 pts)
  const h1Count = $('h1').length;
  const h2Count = $('h2').length;
  const h3Count = $('h3').length;
  
  if (h1Count === 1) {
    details.headingHierarchy.score += 3;
  } else if (h1Count === 0) {
    details.headingHierarchy.issues.push('Aucun H1 trouvé');
  } else {
    details.headingHierarchy.issues.push(`Multiple H1 (${h1Count}) - devrait être unique`);
  }
  
  if (h2Count > 0) {
    details.headingHierarchy.score += 2;
  } else {
    details.headingHierarchy.issues.push('Aucun H2 trouvé');
  }
  
  if (h3Count > 0 && h2Count > 0) {
    details.headingHierarchy.score += 2;
  }
  
  // Ratio divs vs sémantique (5 pts)
  const divCount = $('div').length;
  const semanticCount = $('article, section, aside, nav, header, footer, main').length;
  const totalContainers = divCount + semanticCount;
  
  if (totalContainers > 0) {
    details.divRatio.ratio = semanticCount / totalContainers;
    // Plus le ratio est élevé (plus de sémantique), meilleur est le score
    details.divRatio.score = Math.round(details.divRatio.ratio * 5);
  }
  
  // Détection SSR vs CSR (5 pts)
  // Indicateurs de SSR: contenu texte substantiel, pas juste des divs vides
  const textContent = $('body').text().replace(/\s+/g, ' ').trim();
  const hasSubstantialContent = textContent.length > 500;
  const hasNoscript = $('noscript').length > 0;
  const hasReactRoot = $('#root, #__next, #app').length > 0;
  const hasEmptyRoot = $('#root:empty, #__next:empty, #app:empty').length > 0;
  
  details.ssrDetection.isSSR = hasSubstantialContent && !hasEmptyRoot;
  details.ssrDetection.score = details.ssrDetection.isSSR ? 5 : 0;
  
  const totalScore = 
    details.semanticElements.score +
    details.headingHierarchy.score +
    details.divRatio.score +
    details.ssrDetection.score;
  
  return {
    score: totalScore,
    maxScore: 25,
    details
  };
}

/**
 * 2. DONNÉES STRUCTURÉES (25 pts)
 */
function analyzeStructuredData($, html) {
  const details = {
    jsonLdPresent: { score: 0, max: 10, found: false, schemas: [] },
    schemaTypes: { score: 0, max: 10, types: [] },
    schemaQuality: { score: 0, max: 5, completeness: 0 }
  };
  
  // Chercher JSON-LD
  const jsonLdScripts = $('script[type="application/ld+json"]');
  
  if (jsonLdScripts.length > 0) {
    details.jsonLdPresent.found = true;
    details.jsonLdPresent.score = 10;
    
    jsonLdScripts.each((i, el) => {
      try {
        const content = $(el).html();
        const data = JSON.parse(content);
        
        // Peut être un array ou un objet
        const schemas = Array.isArray(data) ? data : [data];
        
        schemas.forEach(schema => {
          if (schema['@type']) {
            const types = Array.isArray(schema['@type']) ? schema['@type'] : [schema['@type']];
            types.forEach(type => {
              if (!details.schemaTypes.types.includes(type)) {
                details.schemaTypes.types.push(type);
              }
            });
          }
          
          // Vérifier les schemas imbriqués (@graph)
          if (schema['@graph']) {
            schema['@graph'].forEach(item => {
              if (item['@type'] && !details.schemaTypes.types.includes(item['@type'])) {
                details.schemaTypes.types.push(item['@type']);
              }
            });
          }
        });
      } catch (e) {
        // JSON invalide
      }
    });
    
    // Score basé sur les types importants trouvés
    const importantFound = details.schemaTypes.types.filter(t => 
      IMPORTANT_SCHEMAS.some(s => t.includes(s))
    );
    details.schemaTypes.score = Math.min(10, importantFound.length * 2);
    
    // Qualité/complétude (simplifié)
    details.schemaQuality.completeness = details.schemaTypes.types.length > 3 ? 1 : details.schemaTypes.types.length / 3;
    details.schemaQuality.score = Math.round(details.schemaQuality.completeness * 5);
  }
  
  // Vérifier aussi les microdata et RDFa (bonus)
  const hasMicrodata = $('[itemtype]').length > 0;
  if (hasMicrodata && !details.jsonLdPresent.found) {
    details.jsonLdPresent.score = 5; // Points partiels pour microdata
  }
  
  const totalScore = 
    details.jsonLdPresent.score +
    details.schemaTypes.score +
    details.schemaQuality.score;
  
  return {
    score: totalScore,
    maxScore: 25,
    details
  };
}

/**
 * 3. FORMATAGE POUR EXTRACTION (25 pts)
 */
function analyzeExtractionFormat($) {
  const details = {
    faqDetected: { score: 0, max: 7, found: false, method: null },
    tables: { score: 0, max: 6, count: 0, semantic: 0 },
    orderedLists: { score: 0, max: 6, count: 0 },
    metaDescription: { score: 0, max: 6, present: false, length: 0 }
  };
  
  // FAQ (7 pts)
  // Méthode 1: details/summary
  const detailsElements = $('details').length;
  // Méthode 2: Schema FAQPage (déjà vérifié dans structured data)
  // Méthode 3: Structure FAQ classique
  const faqSections = $('[class*="faq"], [id*="faq"], .accordion').length;
  
  if (detailsElements > 0) {
    details.faqDetected.found = true;
    details.faqDetected.method = 'details/summary';
    details.faqDetected.score = 7;
  } else if (faqSections > 0) {
    details.faqDetected.found = true;
    details.faqDetected.method = 'faq-section';
    details.faqDetected.score = 5;
  }
  
  // Tableaux (6 pts)
  const tables = $('table');
  details.tables.count = tables.length;
  
  tables.each((i, table) => {
    const $table = $(table);
    // Un tableau sémantique a thead, th, ou caption
    if ($table.find('thead, th, caption').length > 0) {
      details.tables.semantic++;
    }
  });
  
  if (details.tables.count > 0) {
    const semanticRatio = details.tables.semantic / details.tables.count;
    details.tables.score = Math.round(semanticRatio * 6);
  }
  
  // Listes ordonnées (6 pts)
  details.orderedLists.count = $('ol').length;
  if (details.orderedLists.count > 0) {
    details.orderedLists.score = Math.min(6, details.orderedLists.count * 2);
  }
  
  // Meta description (6 pts)
  const metaDesc = $('meta[name="description"]').attr('content');
  if (metaDesc) {
    details.metaDescription.present = true;
    details.metaDescription.length = metaDesc.length;
    
    // Longueur optimale: 120-160 caractères
    if (metaDesc.length >= 120 && metaDesc.length <= 160) {
      details.metaDescription.score = 6;
    } else if (metaDesc.length >= 80 && metaDesc.length <= 200) {
      details.metaDescription.score = 4;
    } else if (metaDesc.length > 0) {
      details.metaDescription.score = 2;
    }
  }
  
  const totalScore = 
    details.faqDetected.score +
    details.tables.score +
    details.orderedLists.score +
    details.metaDescription.score;
  
  return {
    score: totalScore,
    maxScore: 25,
    details
  };
}

/**
 * 4. ACCESSIBILITÉ AUX BOTS (25 pts)
 */
function analyzeBotAccessibility($, robotsTxt, llmsTxt) {
  const details = {
    robotsTxt: { score: 0, max: 8, analyzed: false, aiBotsAllowed: [], aiBotsBlocked: [] },
    llmsTxt: { score: 0, max: 7, present: false },
    altText: { score: 0, max: 5, total: 0, withAlt: 0 },
    ariaLabels: { score: 0, max: 5, count: 0 }
  };
  
  // Analyse robots.txt (8 pts)
  if (robotsTxt) {
    details.robotsTxt.analyzed = true;
    
    AI_BOTS.forEach(bot => {
      // Chercher des règles spécifiques pour ce bot
      const botRegex = new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?(?=User-agent:|$)`, 'i');
      const botMatch = robotsTxt.match(botRegex);
      
      // Chercher aussi dans User-agent: *
      const wildcardMatch = robotsTxt.match(/User-agent:\s*\*[\s\S]*?(?=User-agent:|$)/i);
      
      let isBlocked = false;
      
      if (botMatch) {
        // Règle spécifique au bot
        if (/Disallow:\s*\/\s*$/m.test(botMatch[0])) {
          isBlocked = true;
        }
      } else if (wildcardMatch) {
        // Utiliser la règle wildcard
        if (/Disallow:\s*\/\s*$/m.test(wildcardMatch[0])) {
          isBlocked = true;
        }
      }
      
      if (isBlocked) {
        details.robotsTxt.aiBotsBlocked.push(bot);
      } else {
        details.robotsTxt.aiBotsAllowed.push(bot);
      }
    });
    
    // Score basé sur le % de bots autorisés
    const allowedRatio = details.robotsTxt.aiBotsAllowed.length / AI_BOTS.length;
    details.robotsTxt.score = Math.round(allowedRatio * 8);
  } else {
    // Pas de robots.txt = tout autorisé par défaut
    details.robotsTxt.aiBotsAllowed = [...AI_BOTS];
    details.robotsTxt.score = 8;
  }
  
  // llms.txt (7 pts)
  if (llmsTxt) {
    details.llmsTxt.present = true;
    details.llmsTxt.score = 7;
  }
  
  // Alt text sur images (5 pts)
  const images = $('img');
  details.altText.total = images.length;
  
  images.each((i, img) => {
    const alt = $(img).attr('alt');
    if (alt && alt.trim().length > 0) {
      details.altText.withAlt++;
    }
  });
  
  if (details.altText.total > 0) {
    const altRatio = details.altText.withAlt / details.altText.total;
    details.altText.score = Math.round(altRatio * 5);
  } else {
    details.altText.score = 5; // Pas d'images = pas de problème
  }
  
  // Aria labels (5 pts)
  details.ariaLabels.count = $('[aria-label], [aria-labelledby], [aria-describedby], [role]').length;
  details.ariaLabels.score = Math.min(5, Math.round(details.ariaLabels.count / 5));
  
  const totalScore = 
    details.robotsTxt.score +
    details.llmsTxt.score +
    details.altText.score +
    details.ariaLabels.score;
  
  return {
    score: totalScore,
    maxScore: 25,
    details
  };
}

/**
 * Génère les recommandations prioritaires
 */
function generateRecommendations(categories) {
  const recommendations = [];
  
  // Machine Readability
  const mr = categories.machineReadability.details;
  if (mr.semanticElements.missing.length > 3) {
    recommendations.push({
      category: 'Lisibilité Machine',
      priority: 'high',
      issue: `Éléments sémantiques manquants: ${mr.semanticElements.missing.slice(0, 3).join(', ')}`,
      action: 'Remplacer les <div> génériques par des balises HTML5 sémantiques (article, section, aside, etc.)'
    });
  }
  
  if (mr.headingHierarchy.issues.length > 0) {
    recommendations.push({
      category: 'Lisibilité Machine',
      priority: 'high',
      issue: mr.headingHierarchy.issues[0],
      action: 'Corriger la hiérarchie des titres: un seul H1, suivi de H2, puis H3'
    });
  }
  
  if (!mr.ssrDetection.isSSR) {
    recommendations.push({
      category: 'Lisibilité Machine',
      priority: 'medium',
      issue: 'Le site semble utiliser le rendu côté client (CSR)',
      action: 'Envisager le SSR ou le pre-rendering pour que le contenu soit visible aux bots'
    });
  }
  
  // Structured Data
  const sd = categories.structuredData.details;
  if (!sd.jsonLdPresent.found) {
    recommendations.push({
      category: 'Données Structurées',
      priority: 'high',
      issue: 'Aucune donnée structurée JSON-LD trouvée',
      action: 'Ajouter des schemas JSON-LD (Organization, LocalBusiness, FAQPage selon le contexte)'
    });
  } else if (sd.schemaTypes.types.length < 2) {
    recommendations.push({
      category: 'Données Structurées',
      priority: 'medium',
      issue: `Seulement ${sd.schemaTypes.types.length} type(s) de schema trouvé(s)`,
      action: 'Enrichir avec des schemas supplémentaires: FAQPage, HowTo, BreadcrumbList'
    });
  }
  
  // Extraction Format
  const ef = categories.extractionFormat.details;
  if (!ef.faqDetected.found) {
    recommendations.push({
      category: 'Formatage pour Extraction',
      priority: 'medium',
      issue: 'Aucune section FAQ détectée',
      action: 'Ajouter une FAQ avec des balises <details>/<summary> ou un schema FAQPage'
    });
  }
  
  if (!ef.metaDescription.present) {
    recommendations.push({
      category: 'Formatage pour Extraction',
      priority: 'high',
      issue: 'Meta description manquante',
      action: 'Ajouter une meta description de 120-160 caractères'
    });
  } else if (ef.metaDescription.length < 80 || ef.metaDescription.length > 200) {
    recommendations.push({
      category: 'Formatage pour Extraction',
      priority: 'low',
      issue: `Meta description de ${ef.metaDescription.length} caractères (optimal: 120-160)`,
      action: 'Ajuster la longueur de la meta description'
    });
  }
  
  // Bot Accessibility
  const ba = categories.botAccessibility.details;
  if (ba.robotsTxt.aiBotsBlocked.length > 0) {
    recommendations.push({
      category: 'Accessibilité Bots',
      priority: 'high',
      issue: `Bots IA bloqués dans robots.txt: ${ba.robotsTxt.aiBotsBlocked.slice(0, 3).join(', ')}`,
      action: 'Autoriser les bots IA dans robots.txt pour être indexé par les moteurs IA'
    });
  }
  
  if (!ba.llmsTxt.present) {
    recommendations.push({
      category: 'Accessibilité Bots',
      priority: 'medium',
      issue: 'Fichier llms.txt non trouvé',
      action: 'Créer un fichier llms.txt à la racine pour guider les LLM'
    });
  }
  
  if (ba.altText.total > 0 && ba.altText.withAlt < ba.altText.total) {
    const missing = ba.altText.total - ba.altText.withAlt;
    recommendations.push({
      category: 'Accessibilité Bots',
      priority: 'medium',
      issue: `${missing} image(s) sans attribut alt`,
      action: 'Ajouter des descriptions alt pertinentes à toutes les images'
    });
  }
  
  // Trier par priorité
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return recommendations;
}

export default analyzeGEO;
