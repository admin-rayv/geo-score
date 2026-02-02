# GEO Score Calculator

📊 **Calculateur de score GEO (Generative Engine Optimization)**

Analyse l'optimisation d'un site web pour les moteurs de recherche IA (ChatGPT, Gemini, Claude, Perplexity).

## Concept

1. User entre son URL
2. On analyse le site (scraping + scoring)
3. **Gratuit:** Score GEO (0-100) + 3 recommandations
4. **Payant:** Rapport complet + Guide GEO PDF

## Structure

```
/geo-score
  /api          # Backend - scraper + scoring engine
  /web          # Frontend - landing page + results
  /docs         # Documentation
```

## Critères d'analyse (100 points)

### 1. Lisibilité Machine (25 pts)
- HTML5 sémantique (article, section, aside, details/summary)
- Hiérarchie des titres (H1 unique, H2, H3 nested properly)
- Ratio divs vs éléments sémantiques
- Détection SSR vs CSR

### 2. Données Structurées (25 pts)
- Présence JSON-LD
- Types Schema détectés (LocalBusiness, Service, FAQPage, Person, Organization)
- Qualité/complétude du schema

### 3. Formatage pour Extraction (25 pts)
- FAQ détectée (details/summary ou schema FAQPage)
- Tableaux HTML propres
- Listes ordonnées pour processus
- Meta description présente et qualité

### 4. Accessibilité aux Bots (25 pts)
- Vérifier robots.txt pour bots IA (GPTBot, ClaudeBot, PerplexityBot...)
- Présence fichier llms.txt
- Alt text sur images
- Aria labels

## Stack

- **Backend:** Node.js + Cheerio
- **Frontend:** Next.js
- **Hosting:** Vercel

## License

MIT
