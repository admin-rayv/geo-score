/**
 * Test du rapport premium
 */

import { generatePremiumReport } from './premium-report.js';

const testUrl = process.argv[2] || 'https://rayv.ca';

console.log('🚀 Testing Premium Report Generator\n');
console.log('='.repeat(50));

generatePremiumReport(testUrl).then(report => {
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 RAPPORT PREMIUM GEO SCORE\n');
  
  console.log(`🌐 Site: ${report.site.url}`);
  console.log(`📄 Pages analysées: ${report.site.pagesAnalyzed} (${report.site.pagesSuccessful} réussies)`);
  console.log(`⏱️  Temps d'analyse: ${report.analysisTime}\n`);
  
  console.log('📈 SCORE GLOBAL');
  console.log(`   Score moyen: ${report.summary.averageScore}/100`);
  console.log(`   Score potentiel: ${report.summary.potentialScore}/100 (+${report.summary.possibleGain} pts)`);
  console.log(`   Min: ${report.summary.lowestScore} | Max: ${report.summary.highestScore}\n`);
  
  console.log('📄 SCORES PAR PAGE');
  report.pages.forEach(page => {
    const status = page.success ? `${page.score}/100` : '❌ Erreur';
    const shortUrl = page.url.replace(report.site.url, '') || '/';
    console.log(`   ${shortUrl.padEnd(40)} ${status}`);
  });
  
  if (report.problemPages.length > 0) {
    console.log('\n⚠️  PAGES PROBLÉMATIQUES');
    report.problemPages.forEach(page => {
      const shortUrl = page.url.replace(report.site.url, '') || '/';
      console.log(`   ${shortUrl} (${page.score}/100)`);
      page.mainIssues.forEach(issue => {
        console.log(`      - ${issue}`);
      });
    });
  }
  
  if (report.globalRecommendations.length > 0) {
    console.log('\n🌍 RECOMMANDATIONS GLOBALES (affectent plusieurs pages)');
    report.globalRecommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec.action}`);
      console.log(`      Affecte ${rec.affectedPages} pages | Priorité: ${rec.priority}`);
    });
  }
  
  console.log('\n🎯 PLAN D\'ACTION PRIORISÉ');
  
  if (report.actionPlan.quickWins.length > 0) {
    console.log('\n   ⚡ QUICK WINS (5-15 min, fort impact)');
    report.actionPlan.quickWins.forEach((item, i) => {
      console.log(`      ${i + 1}. ${item.action}`);
      console.log(`         ⏱️ ${item.estimatedTime} | Impact: ${'★'.repeat(item.impact)}${'☆'.repeat(3-item.impact)}`);
    });
  }
  
  if (report.actionPlan.mediumProjects.length > 0) {
    console.log('\n   🔧 PROJETS MOYENS (30 min - 2h)');
    report.actionPlan.mediumProjects.forEach((item, i) => {
      console.log(`      ${i + 1}. ${item.action}`);
      console.log(`         ⏱️ ${item.estimatedTime} | Impact: ${'★'.repeat(item.impact)}${'☆'.repeat(3-item.impact)}`);
    });
  }
  
  if (report.actionPlan.majorProjects.length > 0) {
    console.log('\n   🏗️  CHANTIERS MAJEURS (plusieurs heures)');
    report.actionPlan.majorProjects.forEach((item, i) => {
      console.log(`      ${i + 1}. ${item.action}`);
      console.log(`         ⏱️ ${item.estimatedTime} | Impact: ${'★'.repeat(item.impact)}${'☆'.repeat(3-item.impact)}`);
    });
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Rapport généré avec succès!\n');
  
}).catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
