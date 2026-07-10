'use client'

import { useEffect } from 'react'

export default function PopupComplete() {
  useEffect(() => {
    // The opener window's onAuthStateChange listener picks up the new
    // session (Supabase syncs auth state across same-origin tabs/windows
    // automatically). Give it a brief moment, then close this popup.
    const timer = setTimeout(() => window.close(), 500)
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
