// app/api/drive/export/route.ts
//
// Creates a new Google Sheet with the multi-tab structure locked earlier:
// Summary, Promoter themes, Passive themes, Detractor flags, Action list,
// Raw responses. Returns the new sheet's URL.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidAccessToken } from "@/lib/google-drive"
import type { AnalysisResult } from "@/lib/nps-data"

function sheetsHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
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

  const npsScore = analysis.metrics.promoter - analysis.metrics.detractor

  // 1. Create the spreadsheet with all tabs defined up front, one API call.
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: sheetsHeaders(accessToken),
    body: JSON.stringify({
      properties: { title: `Chime export — ${new Date().toISOString().slice(0, 10)}` },
      sheets: [
        { properties: { title: "Summary" } },
        { properties: { title: "Promoter themes" } },
        { properties: { title: "Passive themes" } },
        { properties: { title: "Detractor flags" } },
        { properties: { title: "Action list" } },
        { properties: { title: "Raw responses" } },
      ],
    }),
  })

  if (!createRes.ok) {
    console.error("[drive/export] Create spreadsheet failed:", await createRes.text())
    return NextResponse.json({ error: "Failed to create the spreadsheet." }, { status: 502 })
  }

  const created = await createRes.json()
  const spreadsheetId = created.spreadsheetId as string

  // 2. Populate every tab in one batchUpdate (values.batchUpdate is more
  // efficient than one values.update call per tab).
  const promoterThemes = analysis.themes.filter((t) => t.segment === "promoter")
  const passiveThemes = analysis.themes.filter((t) => t.segment === "passive")

  const data = [
    {
      range: "Summary!A1",
      values: [
        ["Metric", "Value"],
        ["NPS score", npsScore],
        ["Promoters %", analysis.metrics.promoter],
        ["Passives %", analysis.metrics.passive],
        ["Detractors %", analysis.metrics.detractor],
        ["Responses analyzed", analysis.responses.length],
        ["Benchmark remark", analysis.benchmark?.remark ?? ""],
        ["Benchmark source", analysis.benchmark?.source ?? ""],
        ["Generated", new Date().toISOString()],
      ],
    },
    {
      range: "Promoter themes!A1",
      values: [
        ["Theme", "Mentions", "Source rows"],
        ...promoterThemes.map((t) => [t.label, t.frequency, t.rowRefs.join(", ")]),
      ],
    },
    {
      range: "Passive themes!A1",
      values: [
        ["Theme", "Mentions", "Source rows"],
        ...passiveThemes.map((t) => [t.label, t.frequency, t.rowRefs.join(", ")]),
      ],
    },
    {
      range: "Detractor flags!A1",
      values: [
        ["Category", "Comment", "Source row"],
        ...analysis.flags.map((f) => [f.category, f.comment, f.rowRef]),
      ],
    },
    {
      range: "Action list!A1",
      values: [
        ["Theme", "Category", "Team", "Mentions", "Source rows"],
        ...analysis.actionList.map((a) => [a.theme, a.category, a.team, a.mentions, a.rowRefs.join(", ")]),
      ],
    },
    {
      range: "Raw responses!A1",
      values: [
        ["Score", "Main benefit", "Improvement", "Persona"],
        ...analysis.responses.map((r) => [r.score, r.main_benefit, r.improvement, r.persona]),
      ],
    },
  ]

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: sheetsHeaders(accessToken),
      body: JSON.stringify({ valueInputOption: "RAW", data }),
    },
  )

  if (!updateRes.ok) {
    console.error("[drive/export] Populate spreadsheet failed:", await updateRes.text())
    return NextResponse.json({ error: "Sheet created but failed to populate." }, { status: 502 })
  }

  return NextResponse.json({
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  })
}
