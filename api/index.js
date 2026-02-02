/**
 * GEO Score API - Point d'entrée
 */

import { scrapeAndAnalyze, formatSummary } from './scraper.js';

// Export pour utilisation en module
export { scrapeAndAnalyze, formatSummary };
export { analyzeGEO } from './analyzer.js';

// CLI si exécuté directement
const args = process.argv.slice(2);

if (args.length > 0) {
  const url = args[0];
  const verbose = args.includes('--verbose') || args.includes('-v');
  const json = args.includes('--json') || args.includes('-j');
  
  console.log(`🔍 Analyse GEO de: ${url}\n`);
  
  scrapeAndAnalyze(url).then(result => {
    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatSummary(result));
      
      if (verbose && result.success) {
        console.log('\n📋 Toutes les recommandations:');
        result.recommendations.forEach((rec, i) => {
          const priorityEmoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
          console.log(`\n${i + 1}. ${priorityEmoji} ${rec.category}`);
          console.log(`   Problème: ${rec.issue}`);
          console.log(`   Action: ${rec.action}`);
        });
      }
    }
  }).catch(err => {
    console.error('Erreur:', err.message);
    process.exit(1);
  });
}
