import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GEOScore - Calculateur de Score GEO',
  description: 'Analysez l\'optimisation de votre site web pour les moteurs de recherche IA (ChatGPT, Gemini, Claude, Perplexity). Score gratuit + recommandations.',
  keywords: 'GEO, SEO, AI, LLM, optimisation, ChatGPT, Claude, Gemini, Perplexity',
  openGraph: {
    title: 'GEOScore - Votre site est-il prêt pour l\'IA?',
    description: 'Calculateur gratuit de score GEO. Découvrez comment les moteurs IA voient votre site.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  )
}
