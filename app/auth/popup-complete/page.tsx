'use client'

import { useEffect } from 'react'

export default function PopupComplete() {
  useEffect(() => {
    // Cookie-based SSR sessions don't emit a cross-window `storage` event, so
    // the opener can't detect the new session on its own. Explicitly notify it
    // so it can re-read the session, then close this popup.
    try {
      window.opener?.postMessage({ type: 'supabase:auth:complete' }, window.location.origin)
    } catch {
      /* opener may be gone */
    }
    const timer = setTimeout(() => window.close(), 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">
        Signing you in — this window will close automatically.
      </p>
    </div>
  )
}
