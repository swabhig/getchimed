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
 * Opens the Google consent popup requesting Drive access and waits for it
 * to close. Token saving happens server-side inside /auth/callback (at the
 * moment the code is exchanged) — not here — since this window has no
 * reliable way to observe a session created in a different browsing
 * context. After this resolves, the caller should re-check
 * /api/drive/token-status (a fresh server read) to confirm the connection
 * actually succeeded.
 */
/**
 * Runs the incremental Drive consent flow using an ALREADY-OPEN popup
 * window (the caller must open this synchronously, as the very first thing
 * in its click handler, before any other awaits — see callers for why).
 * Waits for the popup to close, then resolves. Token saving happens
 * server-side inside /auth/callback (at the moment the code is exchanged)
 * — not here — since this window has no reliable way to observe a session
 * created in a different browsing context. After this resolves, the caller
 * should re-check /api/drive/token-status (a fresh server read) to confirm
 * the connection actually succeeded.
 */
export async function connectGoogleDrive(popup: Window | null): Promise<boolean> {
  if (!popup) return false

  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: DRIVE_SCOPES,
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
    popup.close()
    return false
  }

  popup.location.href = data.url

  // Wait for the popup to close (it self-closes via /auth/popup-complete,
  // after /auth/callback has already saved the tokens server-side).
  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval)
        resolve()
      }
    }, 400)
  })

  return true
}
