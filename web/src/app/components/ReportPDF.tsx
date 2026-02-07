'use client'

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Register fonts (using default for now)
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#f59e0b',
  },
  logo: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#f59e0b',
  },
  reportTitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  scoreNumber: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#ffffff',
  },
  siteInfo: {
    flex: 1,
  },
  siteUrl: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  siteStats: {
    fontSize: 10,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    marginTop: 12,
    color: '#1f2937',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  categoryBox: {
    width: '48%',
    padding: 10,
    marginBottom: 6,
    marginRight: '2%',
    backgroundColor: '#f9fafb',
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 4,
  },
  categoryScore: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },
  actionItem: {
    flexDirection: 'row',
    padding: 8,
    marginBottom: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  actionCritical: {
    backgroundColor: '#fee2e2',
    borderLeftColor: '#ef4444',
  },
  actionImportant: {
    backgroundColor: '#ffedd5',
    borderLeftColor: '#f97316',
  },
  actionNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    textAlign: 'center',
    marginRight: 10,
    fontSize: 10,
    paddingTop: 4,
    fontFamily: 'Helvetica-Bold',
  },
  actionText: {
    flex: 1,
    fontSize: 10,
  },
  pageBreak: {
    marginTop: 20,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pageUrl: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    maxWidth: '70%',
  },
  pageScore: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#f59e0b',
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    width: '50%',
    fontSize: 10,
    color: '#6b7280',
  },
  detailValue: {
    width: '50%',
    fontSize: 10,
  },
  checkOk: {
    color: '#22c55e',
  },
  checkFail: {
    color: '#ef4444',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  recommendationsList: {
    marginTop: 10,
  },
  recItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 10,
  },
  recBullet: {
    width: 15,
    fontSize: 10,
  },
  recText: {
    flex: 1,
    fontSize: 9,
  },
})

interface PageDetails {
  h1Count?: number
  schemaTypes?: string[]
  hasMetaDesc?: boolean
  hasFaq?: boolean
  hasCanonical?: boolean
  hasOpenGraph?: boolean
  hasTwitterCards?: boolean
  hasLlmsTxt?: boolean
  blockedBots?: string[]
  allowedBots?: string[]
  hasNoindex?: boolean
  csrDetected?: boolean
  loadTimeMs?: number
}

interface PageResult {
  url: string
  success: boolean
  score: number
  loadTimeMs?: number
  categories: {
    machineReadability: number
    structuredData: number
    extractionFormat: number
    botAccessibility: number
  } | null
  recommendations: Array<{
    category: string
    priority: string
    action: string
  }>
  details?: PageDetails
}

interface ReportData {
  site: {
    url: string
    pagesAnalyzed: number
    pagesSuccessful: number
  }
  summary: {
    averageScore: number
    scoreLevel: string
  }
  pages: PageResult[]
  actionPlan: {
    critical: Array<{ action: string; category: string }>
    important: Array<{ action: string; category: string }>
    improvements: Array<{ action: string; category: string }>
  }
  generatedAt: string
  analysisTime: string
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  if (score >= 30) return '#f97316'
  return '#ef4444'
}

function safeAverage(pages: PageResult[], getter: (p: PageResult) => number | undefined): number {
  const successful = pages.filter(p => p.success && p.categories)
  if (successful.length === 0) return 0
  const sum = successful.reduce((s, p) => s + (getter(p) || 0), 0)
  return Math.round(sum / successful.length)
}

export function ReportPDF({ report }: { report: ReportData }) {
  const date = new Date(report.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Document>
      {/* Page 1: Summary */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Check GEO Score</Text>
          <Text style={styles.reportTitle}>GEO Analysis Report</Text>
        </View>

        {/* Score Section */}
        <View style={styles.scoreSection}>
          <View style={[styles.scoreCircle, { backgroundColor: getScoreColor(report.summary.averageScore) }]}>
            <Text style={styles.scoreNumber}>{report.summary.averageScore}</Text>
            <Text style={styles.scoreLabel}>/100</Text>
          </View>
          <View style={styles.siteInfo}>
            <Text style={styles.siteUrl}>{report.site.url}</Text>
            <Text style={styles.siteStats}>
              {report.site.pagesAnalyzed} pages analyzed • {report.analysisTime} • {date}
            </Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        <View style={styles.categoryGrid}>
          <View style={styles.categoryBox}>
            <Text style={styles.categoryName}>Machine Readability</Text>
            <Text style={[styles.categoryScore, { color: getScoreColor(safeAverage(report.pages, p => p.categories?.machineReadability) * 4) }]}>
              {safeAverage(report.pages, p => p.categories?.machineReadability)}/25
            </Text>
          </View>
          <View style={styles.categoryBox}>
            <Text style={styles.categoryName}>Structured Data</Text>
            <Text style={[styles.categoryScore, { color: getScoreColor(safeAverage(report.pages, p => p.categories?.structuredData) * 4) }]}>
              {safeAverage(report.pages, p => p.categories?.structuredData)}/25
            </Text>
          </View>
          <View style={styles.categoryBox}>
            <Text style={styles.categoryName}>Extraction Format</Text>
            <Text style={[styles.categoryScore, { color: getScoreColor(safeAverage(report.pages, p => p.categories?.extractionFormat) * 4) }]}>
              {safeAverage(report.pages, p => p.categories?.extractionFormat)}/25
            </Text>
          </View>
          <View style={styles.categoryBox}>
            <Text style={styles.categoryName}>Bot Accessibility</Text>
            <Text style={[styles.categoryScore, { color: getScoreColor(safeAverage(report.pages, p => p.categories?.botAccessibility) * 4) }]}>
              {safeAverage(report.pages, p => p.categories?.botAccessibility)}/25
            </Text>
          </View>
        </View>

        {/* Priority Actions - Combined list */}
        <View wrap={false}>
          <Text style={styles.sectionTitle}>Priority Actions</Text>
          {[
            ...report.actionPlan.critical.slice(0, 3).map(a => ({ ...a, priority: 'critical' as const })),
            ...report.actionPlan.important.slice(0, 3).map(a => ({ ...a, priority: 'important' as const })),
            ...report.actionPlan.improvements.slice(0, 2).map(a => ({ ...a, priority: 'improvement' as const })),
          ].slice(0, 8).map((action, i) => (
            <View 
              key={i} 
              style={[
                styles.actionItem, 
                action.priority === 'critical' ? styles.actionCritical : 
                action.priority === 'important' ? styles.actionImportant : {}
              ]}
            >
              <Text style={[
                styles.actionNumber, 
                { backgroundColor: action.priority === 'critical' ? '#ef4444' : 
                                   action.priority === 'important' ? '#f97316' : '#f59e0b' }
              ]}>{i + 1}</Text>
              <Text style={styles.actionText}>{action.action}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated by checkgeoscore.com</Text>
          <Text>Page 1 of {report.pages.length + 1}</Text>
        </View>
      </Page>

      {/* Page per analyzed page */}
      {report.pages.filter(p => p.success).map((page, index) => (
        <Page key={index} size="A4" style={styles.page}>
          {/* Page Header */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageUrl}>{page.url}</Text>
            <Text style={[styles.pageScore, { color: getScoreColor(page.score) }]}>{page.score}/100</Text>
          </View>

          {/* Category Scores */}
          <Text style={styles.sectionTitle}>Category Scores</Text>
          <View style={styles.categoryGrid}>
            <View style={styles.categoryBox}>
              <Text style={styles.categoryName}>Machine Readability</Text>
              <Text style={styles.categoryScore}>{page.categories?.machineReadability || 0}/25</Text>
            </View>
            <View style={styles.categoryBox}>
              <Text style={styles.categoryName}>Structured Data</Text>
              <Text style={styles.categoryScore}>{page.categories?.structuredData || 0}/25</Text>
            </View>
            <View style={styles.categoryBox}>
              <Text style={styles.categoryName}>Extraction Format</Text>
              <Text style={styles.categoryScore}>{page.categories?.extractionFormat || 0}/25</Text>
            </View>
            <View style={styles.categoryBox}>
              <Text style={styles.categoryName}>Bot Accessibility</Text>
              <Text style={styles.categoryScore}>{page.categories?.botAccessibility || 0}/25</Text>
            </View>
          </View>

          {/* Details */}
          {page.details && (
            <>
              <Text style={styles.sectionTitle}>Analysis Details</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>H1 Heading</Text>
                <Text style={[styles.detailValue, page.details.h1Count === 1 ? styles.checkOk : styles.checkFail]}>
                  {page.details.h1Count === 1 ? '✓' : '✗'} {page.details.h1Count || 0} found
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>JSON-LD Schema</Text>
                <Text style={[styles.detailValue, (page.details.schemaTypes?.length || 0) > 0 ? styles.checkOk : styles.checkFail]}>
                  {(page.details.schemaTypes?.length || 0) > 0 ? '✓' : '✗'} {page.details.schemaTypes?.join(', ') || 'None'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Meta Description</Text>
                <Text style={[styles.detailValue, page.details.hasMetaDesc ? styles.checkOk : styles.checkFail]}>
                  {page.details.hasMetaDesc ? '✓ Present' : '✗ Missing'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Canonical URL</Text>
                <Text style={[styles.detailValue, page.details.hasCanonical ? styles.checkOk : styles.checkFail]}>
                  {page.details.hasCanonical ? '✓ Present' : '✗ Missing'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Open Graph</Text>
                <Text style={[styles.detailValue, page.details.hasOpenGraph ? styles.checkOk : styles.checkFail]}>
                  {page.details.hasOpenGraph ? '✓ Present' : '✗ Missing'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Twitter Cards</Text>
                <Text style={[styles.detailValue, page.details.hasTwitterCards ? styles.checkOk : styles.checkFail]}>
                  {page.details.hasTwitterCards ? '✓ Present' : '✗ Missing'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>FAQ Structure</Text>
                <Text style={[styles.detailValue, page.details.hasFaq ? styles.checkOk : styles.checkFail]}>
                  {page.details.hasFaq ? '✓ Present' : '✗ Missing'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>llms.txt</Text>
                <Text style={[styles.detailValue, page.details.hasLlmsTxt ? styles.checkOk : styles.checkFail]}>
                  {page.details.hasLlmsTxt ? '✓ Present' : '✗ Missing'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Indexable</Text>
                <Text style={[styles.detailValue, !page.details.hasNoindex ? styles.checkOk : styles.checkFail]}>
                  {!page.details.hasNoindex ? '✓ Yes' : '✗ noindex set'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Server Rendered</Text>
                <Text style={[styles.detailValue, !page.details.csrDetected ? styles.checkOk : styles.checkFail]}>
                  {!page.details.csrDetected ? '✓ Yes' : '✗ CSR detected'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Load Time</Text>
                <Text style={[styles.detailValue, (page.details.loadTimeMs || page.loadTimeMs || 0) < 3000 ? styles.checkOk : styles.checkFail]}>
                  {page.details.loadTimeMs || page.loadTimeMs || 0}ms
                </Text>
              </View>
              
              {page.details.allowedBots && page.details.allowedBots.length > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>AI Bots Allowed</Text>
                  <Text style={[styles.detailValue, styles.checkOk]}>
                    {page.details.allowedBots.join(', ')}
                  </Text>
                </View>
              )}
              
              {page.details.blockedBots && page.details.blockedBots.length > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>AI Bots Blocked</Text>
                  <Text style={[styles.detailValue, styles.checkFail]}>
                    {page.details.blockedBots.join(', ')}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Page Recommendations */}
          {page.recommendations.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              <View style={styles.recommendationsList}>
                {page.recommendations.map((rec, i) => (
                  <View key={i} style={styles.recItem}>
                    <Text style={[styles.recBullet, rec.priority === 'high' ? styles.checkFail : {}]}>
                      {rec.priority === 'high' ? '!' : '•'}
                    </Text>
                    <Text style={styles.recText}>{rec.action}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text>Generated by checkgeoscore.com</Text>
            <Text>Page {index + 2} of {report.pages.filter(p => p.success).length + 1}</Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}
