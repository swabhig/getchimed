// app/api/feedback/route.ts
//
// Receives "Rate this page" submissions from the footer widget. Anonymous —
// no auth required, since this is feedback about the app itself.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const { score, comment } = await req.json()

  if (typeof score !== "number" || score < 0 || score > 10) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.from("site_feedback").insert({
    score,
    comment: comment || null,
    page: "landing",
  })

  if (error) {
    console.error("[feedback] Failed to save:", error)
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
