import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const GA_MEASUREMENT_ID = 'G-0B5ZXKEBMD'

export const metadata: Metadata = {
  title: 'Check GEO Score - Free AI Search Optimization Analyzer',
  description: 'Analyze your website optimization for AI search engines (ChatGPT, Gemini, Claude, Perplexity). Free score + recommendations.',
  keywords: 'GEO, SEO, AI, LLM, optimization, ChatGPT, Claude, Gemini, Perplexity',
  openGraph: {
    title: 'Check GEO Score - Is Your Site Ready for AI?',
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
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
