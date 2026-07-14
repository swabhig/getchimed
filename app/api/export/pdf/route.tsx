// app/api/export/pdf/route.ts
//
// Generates the polished one-page PDF export — hero NPS score, benchmark
// line, metric cards, a plain-English takeaway, simplified word-cloud
// styling, and fixes-by-team rows. Matches the visual language of the
// Results screen and the approved preview mockup.
//
// Uses @react-pdf/renderer, which builds real PDFs from React components
// server-side — no headless browser needed, works fine in a serverless
// Next.js route.

import { NextRequest, NextResponse } from "next/server"
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer"
import type { AnalysisResult } from "@/lib/nps-data"

const COLORS = {
  fg: "#171614",
  muted: "#78746D",
  accent: "#FF6B35",
  promoter: "#1F8A5B",
  promoterBg: "#E7F5EE",
  passive: "#B8860B",
  passiveBg: "#FBF1DC",
  detractor: "#C4432E",
  detractorBg: "#FBEAE6",
  card: "#FDFCFB",
  border: "#E7E3DD",
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: COLORS.fg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  logo: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  headerDate: { fontSize: 9, color: COLORS.muted },
  divider: { borderBottom: `1pt solid ${COLORS.border}`, marginBottom: 28 },
  heroLabel: { fontSize: 9, color: COLORS.muted, textAlign: "center", marginBottom: 6 },
  heroScore: { fontSize: 56, fontFamily: "Helvetica-Bold", textAlign: "center" },
  heroRemark: { fontSize: 9.5, color: COLORS.muted, textAlign: "center", marginTop: 8, marginBottom: 24 },
  metricsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  metricCard: { flex: 1, borderRadius: 6, padding: 12 },
  metricValue: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  metricLabel: { fontSize: 8.5, color: COLORS.muted, marginTop: 2 },
  takeawayBox: {
    borderRadius: 6,
    padding: 12,
    backgroundColor: COLORS.card,
    border: `1pt solid ${COLORS.border}`,
    marginBottom: 22,
  },
  takeawayLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.accent, marginBottom: 5 },
  takeawayText: { fontSize: 9.5, lineHeight: 1.4 },
  sectionLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.muted, marginBottom: 8 },
  cloudRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  cloudCard: { flex: 1, borderRadius: 6, padding: 12, backgroundColor: COLORS.card, border: `1pt solid ${COLORS.border}` },
  cloudCardLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  cloudWordBig: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  cloudWordMed: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  cloudWordSmall: { fontSize: 9.5 },
  fixRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  fixCategory: { fontSize: 7.5, fontFamily: "Helvetica-Bold", width: 90 },
  fixTheme: { fontSize: 9.5, flex: 1 },
  fixTeam: { fontSize: 8.5, color: COLORS.muted },
  footer: {
    borderTop: `1pt solid ${COLORS.border}`,
    marginTop: 24,
    paddingTop: 12,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: "center",
  },
})

function CloudSection({
  title,
  color,
  themes,
}: {
  title: string
  color: string
  themes: { label: string; frequency: number }[]
}) {
  const sorted = [...themes].sort((a, b) => b.frequency - a.frequency).slice(0, 4)
  return (
    <View style={styles.cloudCard}>
      <Text style={[styles.cloudCardLabel, { color }]}>{title.toUpperCase()}</Text>
      {sorted.map((t, i) => (
        <Text
          key={t.label}
          style={i === 0 ? styles.cloudWordBig : i === 1 ? styles.cloudWordMed : styles.cloudWordSmall}
        >
          <Text style={{ color }}>{t.label}</Text>
        </Text>
      ))}
      {sorted.length === 0 && <Text style={{ fontSize: 9, color: COLORS.muted }}>No themes available.</Text>}
    </View>
  )
}

function buildTakeaway(analysis: AnalysisResult, npsScore: number): string {
  const promoterThemes = analysis.themes.filter((t) => t.segment === "promoter").sort((a, b) => b.frequency - a.frequency)
  const passiveThemes = analysis.themes.filter((t) => t.segment === "passive").sort((a, b) => b.frequency - a.frequency)
  const parts: string[] = []
  if (promoterThemes[0]) parts.push(`Customers love your ${promoterThemes[0].label.toLowerCase()} — that's your strongest signal.`)
  if (passiveThemes[0]) parts.push(`${passiveThemes[0].label} is your biggest blocker to converting passives into promoters.`)
  if (analysis.benchmark) parts.push(`Your NPS of ${npsScore} — ${analysis.benchmark.remark}`)
  return parts.join(" ")
}

function ChimeExportDocument({ analysis }: { analysis: AnalysisResult }) {
  const npsScore = analysis.metrics.promoter - analysis.metrics.detractor
  const promoterThemes = analysis.themes.filter((t) => t.segment === "promoter")
  const passiveThemes = analysis.themes.filter((t) => t.segment === "passive")

  const topFixes = analysis.actionList.slice(0, 5)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.logo}>Chime</Text>
          <Text style={styles.headerDate}>Exported {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</Text>
        </View>
        <View style={styles.divider} />

        <Text style={styles.heroLabel}>YOUR NPS SCORE</Text>
        <Text style={styles.heroScore}>{npsScore}</Text>
        {analysis.benchmark && <Text style={styles.heroRemark}>{analysis.benchmark.remark}</Text>}

        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: COLORS.promoterBg }]}>
            <Text style={[styles.metricValue, { color: COLORS.promoter }]}>{analysis.metrics.promoter}%</Text>
            <Text style={styles.metricLabel}>Promoters</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: COLORS.passiveBg }]}>
            <Text style={[styles.metricValue, { color: COLORS.passive }]}>{analysis.metrics.passive}%</Text>
            <Text style={styles.metricLabel}>Passives</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: COLORS.detractorBg }]}>
            <Text style={[styles.metricValue, { color: COLORS.detractor }]}>{analysis.metrics.detractor}%</Text>
            <Text style={styles.metricLabel}>Detractors</Text>
          </View>
        </View>

        <View style={styles.takeawayBox}>
          <Text style={styles.takeawayLabel}>TAKEAWAY</Text>
          <Text style={styles.takeawayText}>{buildTakeaway(analysis, npsScore)}</Text>
        </View>

        <Text style={styles.sectionLabel}>WHAT CUSTOMERS ARE TELLING YOU</Text>
        <View style={styles.cloudRow}>
          <CloudSection title="What they love" color={COLORS.promoter} themes={promoterThemes} />
          <CloudSection title="What's holding them back" color={COLORS.passive} themes={passiveThemes} />
        </View>

        <Text style={styles.sectionLabel}>FIXES BY TEAM</Text>
        {topFixes.map((fix) => {
          const isDoubleDown = fix.category === "double-down"
          const color = isDoubleDown ? COLORS.promoter : COLORS.passive
          const bg = isDoubleDown ? COLORS.promoterBg : COLORS.passiveBg
          return (
            <View key={fix.theme} style={[styles.fixRow, { backgroundColor: bg }]}>
              <Text style={[styles.fixCategory, { color }]}>{fix.category.toUpperCase()}</Text>
              <Text style={styles.fixTheme}>{fix.theme}</Text>
              <Text style={styles.fixTeam}>{fix.team}</Text>
            </View>
          )
        })}

        <Text style={styles.footer}>
          Generated by Chime · getchimed.site · based on {analysis.responses.length} responses
        </Text>
      </Page>
    </Document>
  )
}

export async function POST(req: NextRequest) {
  const { analysis }: { analysis: AnalysisResult } = await req.json()
  if (!analysis) {
    return NextResponse.json({ error: "Missing analysis" }, { status: 400 })
  }

  try {
    const buffer = await renderToBuffer(<ChimeExportDocument analysis={analysis} />)
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="chime-export.pdf"',
      },
    })
  } catch (err) {
    console.error("[export/pdf] Failed to generate PDF:", err)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
