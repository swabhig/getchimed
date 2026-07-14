// app/api/drive/token-status/route.ts
//
// Returns a valid access token if the current user has previously connected
// Google Drive/Sheets (refreshing it first if it's expired). Returns
// { accessToken: null } if they've never connected or the refresh failed —
// the client uses that to decide whether to run the consent popup.

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidAccessToken } from "@/lib/google-drive"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ accessToken: null }, { status: 401 })
  }

  const accessToken = await getValidAccessToken(user.id)
  return NextResponse.json({ accessToken })
}
