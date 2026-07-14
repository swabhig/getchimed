// app/api/drive/save-tokens/route.ts
//
// Called from the client right after the incremental Google consent popup
// completes. The popup's resulting Supabase session carries provider_token
// (access token) and provider_refresh_token (refresh token) — these aren't
// persisted by Supabase itself, so we store them here.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { saveGoogleTokens } from "@/lib/google-drive"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const { accessToken, refreshToken, expiresIn } = await req.json()

  if (!accessToken) {
    return NextResponse.json({ error: "Missing accessToken" }, { status: 400 })
  }

  await saveGoogleTokens(user.id, accessToken, refreshToken ?? null, expiresIn ?? 3600)

  return NextResponse.json({ ok: true })
}
