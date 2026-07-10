import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Land on a small self-closing page rather than the full app — this
      // route is used by the popup-based sign-in flow triggered mid-analyze.
      return NextResponse.redirect(`${origin}/auth/popup-complete`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
