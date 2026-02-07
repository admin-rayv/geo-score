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
  alternates: {
    canonical: 'https://checkgeoscore.com',
  },
  openGraph: {
    title: 'Check GEO Score - Is Your Site Ready for AI?',
    description: 'Free GEO score calculator. Discover how AI engines see your site.',
    type: 'website',
    url: 'https://checkgeoscore.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Check GEO Score - Is Your Site Ready for AI?',
    description: 'Free GEO score calculator. Discover how AI engines see your site.',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "name": "Check GEO Score",
                  "url": "https://checkgeoscore.com",
                  "logo": "https://checkgeoscore.com/logo.png",
                  "description": "Free GEO score calculator for AI search optimization"
                },
                {
                  "@type": "WebApplication",
                  "name": "Check GEO Score",
                  "url": "https://checkgeoscore.com",
                  "applicationCategory": "SEO Tool",
                  "operatingSystem": "Web Browser",
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                  }
                },
                {
                  "@type": "FAQPage",
                  "mainEntity": [
                    {
                      "@type": "Question",
                      "name": "What exactly is GEO?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "GEO stands for Generative Engine Optimization. It's the optimization of your website for AI-powered search engines like ChatGPT, Claude, Gemini, and Perplexity."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "What's the difference between SEO and GEO?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "SEO optimizes for traditional crawlers (Google, Bing) that index pages. GEO optimizes for LLMs that analyze semantic structure, structured data (JSON-LD), and machine readability."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Is the analysis really free?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes! The complete multi-page analysis with GEO score, category breakdown, and all recommendations is 100% free, no signup required."
                      }
                    }
                  ]
                }
              ]
            })
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
