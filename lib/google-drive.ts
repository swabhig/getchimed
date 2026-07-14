// lib/google-drive.ts
//
// Server-side helpers for the incremental Google Drive/Sheets OAuth flow.
// These tokens are separate from the basic Supabase sign-in session —
// requested only when someone uses Import from Sheet / Export to Sheets.
//
// Requires env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (same OAuth
// client already used for sign-in — the secret is on the GCP client's page).

import { createClient } from "@/lib/supabase/server"

interface GoogleTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: string
}

export async function saveGoogleTokens(
  userId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresInSeconds: number,
) {
  const supabase = await createClient()
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

  await supabase.from("google_tokens").upsert(
    {
      user_id: userId,
      access_token: accessToken,
      // Google only sends a refresh_token on the FIRST consent — don't
      // overwrite a previously stored one with null on subsequent calls.
      ...(refreshToken ? { refresh_token: refreshToken } : {}),
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )
}

/**
 * Returns a valid access token for the current user, refreshing it first
 * if it's expired (or about to expire). Returns null if the user has never
 * connected Google Drive/Sheets, or if refresh fails (refresh token revoked
 * — caller should prompt them to reconnect).
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("google_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data) return null

  const expiresAt = new Date(data.expires_at).getTime()
  const isExpiringSoon = expiresAt - Date.now() < 60_000 // refresh if <1 min left

  if (!isExpiringSoon) {
    return data.access_token
  }

  if (!data.refresh_token) {
    // Token expired and we have nothing to refresh with — the person needs
    // to reconnect (grant consent again) to get a fresh refresh token.
    return null
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  })

  if (!res.ok) {
    console.error("[google-drive] Token refresh failed:", await res.text())
    return null
  }

  const refreshed = await res.json()
  await saveGoogleTokens(userId, refreshed.access_token, null, refreshed.expires_in)
  return refreshed.access_token as string
}
