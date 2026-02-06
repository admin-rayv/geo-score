# getGEOscore

📊 **GEO Score Calculator (Generative Engine Optimization)**

Analyze website optimization for AI search engines (ChatGPT, Gemini, Claude, Perplexity).

🌐 **https://getgeoscore.com**

## Concept

1. User enters their URL
2. We analyze the site (scraping + scoring)
3. **Free:** GEO Score (0-100) + 3 recommendations
4. **Paid:** Full report ($29) + GEO Guide PDF ($49.99)

## Structure

```
/geo-score
  /api          # Backend - scraper + scoring engine
  /web          # Frontend - Next.js app
```

## Scoring Criteria (100 points)

### 1. Machine Readability (25 pts)
- Semantic HTML5 (article, section, aside, details/summary)
- Heading hierarchy (unique H1, properly nested H2, H3)
- Divs vs semantic elements ratio
- SSR vs CSR detection

### 2. Structured Data (25 pts)
- JSON-LD presence
- Schema types detected (LocalBusiness, Service, FAQPage, Person, Organization)
- Schema quality/completeness

### 3. Extraction Format (25 pts)
- FAQ detected (details/summary or FAQPage schema)
- Clean HTML tables
- Ordered lists for processes
- Meta description presence and quality

### 4. Bot Accessibility (25 pts)
- robots.txt check for AI bots (GPTBot, ClaudeBot, PerplexityBot...)
- llms.txt file presence
- Alt text on images
- ARIA labels

## Stack

- **Backend:** Node.js + Cheerio
- **Frontend:** Next.js + Tailwind
- **Hosting:** Vercel

## Dev

```bash
cd web
npm install
npm run dev -- -p 3005
```

## License

MIT
