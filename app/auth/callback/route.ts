import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { saveGoogleTokens } from '@/lib/google-drive'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If this exchange carried a provider_token (i.e. this was the
      // incremental Drive-scope consent flow, not just basic sign-in),
      // save it here — server-side, at the moment we actually have it.
      // This avoids relying on the popup's opener window picking up the
      // new session on its own, which it has no reliable way to do since
      // it's a separate browsing context with its own cached client state.
      const session = data.session as any
      if (session?.provider_token && data.user) {
        await saveGoogleTokens(
          data.user.id,
          session.provider_token,
          session.provider_refresh_token ?? null,
          3600,
        )
      }

      // Land on a small self-closing page rather than the full app — this
      // route is used by the popup-based sign-in flow triggered mid-analyze.
      return NextResponse.redirect(`${origin}/auth/popup-complete`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
