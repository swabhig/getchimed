// app/api/cron/keep-alive/route.ts
//
// Hit on a schedule by Vercel Cron (see vercel.json) to keep the Supabase
// free-tier project from auto-pausing after 7 days of no database
// activity. Just does a trivial read — that's all Supabase needs to see
// to reset its inactivity timer.
//
// Protected by CRON_SECRET so this can't be triggered by randoms hitting
// the URL — Vercel Cron automatically sends this as a bearer token.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  // A trivial read against any real table — counts as genuine database
  // activity as far as Supabase's inactivity check is concerned.
  const { error } = await supabase.from("responses").select("id").limit(1)

  if (error) {
    console.error("[keep-alive] Ping failed:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, pinged: new Date().toISOString() })
}
