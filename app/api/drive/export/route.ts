// app/api/drive/export/route.ts
//
// Creates a new Google Sheet with the full analysis, using the DRIVE API's
// file creation + CSV-to-Sheets auto-conversion (same technique used for
// the sample test sheet) rather than the Sheets API's spreadsheets.create.
// This keeps the whole integration on the non-sensitive drive.file scope —
// no user cap, no "unverified app" warning, no Google review needed.
//
// Trade-off: one combined sheet with stacked sections, not separate named
// tabs (that would require the Sheets API's sensitive `spreadsheets` scope).

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidAccessToken } from "@/lib/google-drive"
import type { AnalysisResult } from "@/lib/nps-data"

function csvEscape(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvEscape).join(",")
}

function textBar(percent: number, width = 32): string {
  const filled = Math.round((percent / 100) * width)
  return "█".repeat(filled) + "░".repeat(width - filled)
}

function buildTakeaway(analysis: AnalysisResult, npsScore: number): string {
  const promoterThemes = analysis.themes
    .filter((t) => t.segment === "promoter")
    .sort((a, b) => b.frequency - a.frequency)
  const passiveThemes = analysis.themes
    .filter((t) => t.segment === "passive")
    .sort((a, b) => b.frequency - a.frequency)

  const parts: string[] = []

  if (promoterThemes[0]) {
    parts.push(`Customers love your ${promoterThemes[0].label.toLowerCase()} — that's your strongest signal.`)
  }
  if (passiveThemes[0]) {
    parts.push(
      `${passiveThemes[0].label} is your biggest blocker to converting passives into promoters.`,
    )
  }
  if (analysis.benchmark) {
    parts.push(`Your NPS of ${npsScore} — ${analysis.benchmark.remark}`)
  } else {
    parts.push(`Your NPS is ${npsScore}.`)
  }

  return parts.join(" ")
}

function buildCombinedCsv(analysis: AnalysisResult): string {
  const npsScore = analysis.metrics.promoter - analysis.metrics.detractor
  const promoterThemes = analysis.themes.filter((t) => t.segment === "promoter")
  const passiveThemes = analysis.themes.filter((t) => t.segment === "passive")

  const lines: string[] = []

  lines.push(csvRow(["TAKEAWAY"]))
  lines.push(csvRow([buildTakeaway(analysis, npsScore)]))
  lines.push("")

  lines.push(csvRow(["SUMMARY"]))
  lines.push(csvRow(["Metric", "Value"]))
  lines.push(csvRow(["NPS score", npsScore]))
  lines.push(csvRow(["Promoters", `${analysis.metrics.promoter}%  ${textBar(analysis.metrics.promoter)}`]))
  lines.push(csvRow(["Passives", `${analysis.metrics.passive}%  ${textBar(analysis.metrics.passive)}`]))
  lines.push(csvRow(["Detractors", `${analysis.metrics.detractor}%  ${textBar(analysis.metrics.detractor)}`]))
  lines.push(csvRow(["Responses analyzed", analysis.responses.length]))
  lines.push(csvRow(["Benchmark remark", analysis.benchmark?.remark ?? ""]))
  lines.push(csvRow(["Benchmark source", analysis.benchmark?.source ?? ""]))
  lines.push(csvRow(["Generated", new Date().toISOString()]))
  lines.push("")

  lines.push(csvRow(["PROMOTER THEMES"]))
  lines.push(csvRow(["Theme", "Mentions", "Source rows"]))
  for (const t of promoterThemes) lines.push(csvRow([t.label, t.frequency, t.rowRefs.join("; ")]))
  lines.push("")

  lines.push(csvRow(["PASSIVE THEMES"]))
  lines.push(csvRow(["Theme", "Mentions", "Source rows"]))
  for (const t of passiveThemes) lines.push(csvRow([t.label, t.frequency, t.rowRefs.join("; ")]))
  lines.push("")

  lines.push(csvRow(["DETRACTOR FLAGS"]))
  lines.push(csvRow(["Category", "Comment", "Source row"]))
  for (const f of analysis.flags) lines.push(csvRow([f.category, f.comment, f.rowRef]))
  lines.push("")

  lines.push(csvRow(["ACTION LIST"]))
  lines.push(csvRow(["Double-down = reinforce what's working. Fix-blocker = what's stopping passives from becoming promoters."]))
  lines.push(csvRow(["Theme", "Category", "Team", "Mentions", "Source rows"]))
  for (const a of analysis.actionList) {
    lines.push(csvRow([a.theme, a.category, a.team, a.mentions, a.rowRefs.join("; ")]))
  }
  lines.push("")

  lines.push(csvRow(["RAW RESPONSES"]))
  lines.push(csvRow(["Score", "Main benefit", "Improvement", "Persona"]))
  for (const r of analysis.responses) {
    lines.push(csvRow([r.score, r.main_benefit, r.improvement, r.persona]))
  }

  return lines.join("\n")
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const { analysis }: { analysis: AnalysisResult } = await req.json()
  if (!analysis) {
    return NextResponse.json({ error: "Missing analysis" }, { status: 400 })
  }

  const accessToken = await getValidAccessToken(user.id)
  if (!accessToken) {
    return NextResponse.json(
      { error: "Google Drive isn't connected (or the connection expired). Please reconnect." },
      { status: 401 },
    )
  }

  const csv = buildCombinedCsv(analysis)
  const title = `Chime export — ${new Date().toISOString().slice(0, 10)}`

  const metadata = {
    name: title,
    mimeType: "application/vnd.google-apps.spreadsheet", // target type — triggers Drive's CSV-to-Sheets conversion
  }

  const boundary = "chime-export-boundary"
  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/csv\r\n\r\n` +
    `${csv}\r\n` +
    `--${boundary}--`

  const createRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    },
  )

  if (!createRes.ok) {
    const body = await createRes.text()
    console.error("[drive/export] Create spreadsheet failed:", body)
    return NextResponse.json({ error: "Failed to create the spreadsheet." }, { status: 502 })
  }

  const created = await createRes.json()

  return NextResponse.json({
    url: `https://docs.google.com/spreadsheets/d/${created.id}/edit`,
  })
}
