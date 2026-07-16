import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

/**
 * Runs the popup-based Google sign-in flow and resolves with the authenticated
 * user (or null if it was cancelled / failed).
 *
 * Why this exists: with @supabase/ssr the session lives in cookies, and the
 * /auth/callback route completes the code exchange *server-side inside the
 * popup*. That cookie write does NOT emit a `storage` event in the opener
 * window, so the opener's `onAuthStateChange` listener never fires. Relying on
 * it (as the old code did) meant the popup closed but the app stayed signed
 * out. Instead we let the popup postMessage us when it's done, then re-read the
 * session fresh from the cookie via getUser(). A popup-close poll is kept as a
 * fallback in case the message is missed or the user dismisses the window.
 */
export async function signInWithGooglePopup(): Promise<User | null> {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      skipBrowserRedirect: true, // open a popup instead of navigating this window away
    },
  })

  if (error || !data?.url) {
    console.error('[chime] Google sign-in error:', error)
    return null
  }

  const popup = window.open(data.url, 'google-oauth', 'width=480,height=640')

  return new Promise<User | null>((resolve) => {
    let settled = false

    const cleanup = () => {
      window.removeEventListener('message', onMessage)
      clearInterval(poll)
    }

    const finish = async () => {
      if (settled) return
      // Read the session fresh — /auth/callback set the cookie server-side.
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        settled = true
        cleanup()
        try {
          popup?.close()
        } catch {
          /* cross-origin close guard */
        }
        resolve(user)
      }
    }

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type === 'supabase:auth:complete') finish()
    }
    window.addEventListener('message', onMessage)

    // Fallback: if the popup is closed (message missed or user dismissed it),
    // do one final session check and stop waiting either way.
    const poll = setInterval(async () => {
      if (!popup || popup.closed) {
        if (!settled) {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          settled = true
          cleanup()
          resolve(user ?? null)
        }
      }
    }, 500)
  })
}
