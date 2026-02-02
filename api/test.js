/**
 * Tests du GEO Score Analyzer
 */

import { scrapeAndAnalyze, formatSummary } from './scraper.js';

const TEST_URLS = [
  'https://rayv.ca',           // Notre site
  'https://stripe.com',        // Bon exemple de site moderne
  'https://example.com',       // Site minimal
  'https://quebec.ca',         // Site gouvernemental
  'https://shopify.com'        // E-commerce bien structuré
];

async function runTests() {
  console.log('🧪 Tests du GEO Score Analyzer\n');
  console.log('='.repeat(50));
  
  for (const url of TEST_URLS) {
    console.log(`\n📍 Testing: ${url}`);
    console.log('-'.repeat(50));
    
    try {
      const result = await scrapeAndAnalyze(url);
      
      if (result.success) {
        console.log(`✅ Score: ${result.score}/100`);
        console.log(`   ├─ Machine Readability: ${result.categories.machineReadability.score}/25`);
        console.log(`   ├─ Structured Data: ${result.categories.structuredData.score}/25`);
        console.log(`   ├─ Extraction Format: ${result.categories.extractionFormat.score}/25`);
        console.log(`   └─ Bot Accessibility: ${result.categories.botAccessibility.score}/25`);
        console.log(`   ⏱️  Duration: ${result.durationMs}ms`);
        console.log(`   📄 HTML Size: ${(result.meta.htmlSize / 1024).toFixed(1)}KB`);
      } else {
        console.log(`❌ Error: ${result.error}`);
      }
    } catch (err) {
      console.log(`❌ Exception: ${err.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Tests complétés!');
}

runTests();
