import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GEOScore - GEO Score Calculator',
  description: 'Analyze your website optimization for AI search engines (ChatGPT, Gemini, Claude, Perplexity). Free score + recommendations.',
  keywords: 'GEO, SEO, AI, LLM, optimization, ChatGPT, Claude, Gemini, Perplexity',
  openGraph: {
    title: 'GEOScore - Is Your Site Ready for AI?',
    description: 'Free GEO score calculator. Discover how AI engines see your site.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
