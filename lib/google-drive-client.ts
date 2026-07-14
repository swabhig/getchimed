// lib/google-drive-client.ts
//
// Requests incremental Drive access via a popup — separate from the main
// sign-in flow, only triggered when someone actually clicks Import from
// Sheet or Export to Sheets. Reuses the same popup pattern as the main
// sign-in (skipBrowserRedirect + window.open), and lands on the existing
// /auth/popup-complete page, which self-closes.
//
// Uses ONLY drive.file — deliberately not the Sheets API's `spreadsheets`
// scope. `spreadsheets` is classified Sensitive by Google, which caps
// unverified apps at ~100 total users and shows a scary "unverified app"
// warning until a real verification review is completed. `drive.file` is
// non-sensitive, has no user cap, and is Google's own recommended pattern
// for exactly this Picker-based import/export use case — see the routes
// in app/api/drive/ for how import/export work within this single scope.

import { createClient } from "@/lib/supabase/client"

const DRIVE_SCOPES = "https://www.googleapis.com/auth/drive.file"

/**
 * Opens the Google consent popup requesting Drive access, waits for
 * it to close, then reads the resulting session's provider tokens and saves
 * them server-side. Resolves true if a token was obtained, false if the
 * popup was closed without completing.
 */
export async function connectGoogleDrive(): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: DRIVE_SCOPES,
      // Goes through /auth/callback first (exchanges Google's auth code for
      // a real session — this step was missing before, which is why the
      // popup would close successfully but provider_token stayed empty).
      // /auth/callback itself then redirects to /auth/popup-complete.
      redirectTo: `${window.location.origin}/auth/callback`,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: "offline", // required to get a refresh_token back
        prompt: "consent", // required alongside offline access to guarantee a refresh_token every time
      },
    },
  })

  if (error || !data?.url) {
    console.error("[google-drive] Failed to start consent flow:", error)
    return false
  }

  const popup = window.open(data.url, "google-drive-consent", "width=480,height=640")
  if (!popup) return false

  // Wait for the popup to close (it self-closes via /auth/popup-complete).
  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval)
        resolve()
      }
    }, 400)
  })

  // Read the fresh session — provider_token/provider_refresh_token are
  // populated after the incremental consent completes.
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session as any

  if (!session?.provider_token) {
    return false
  }

  const res = await fetch("/api/drive/save-tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: session.provider_token,
      refreshToken: session.provider_refresh_token ?? null,
      expiresIn: 3600,
    }),
  })

  return res.ok
}
