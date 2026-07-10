'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()

  async function signInWithGoogle() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('Sign in error:', error)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Hero headline */}
        <div className="space-y-4">
          <p className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Beyond the score, chime.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            Turn NPS feedback into action without losing the nuance.
          </p>
        </div>

        {/* Sign in button */}
        <div className="space-y-4 pt-4">
          <Button
            onClick={signInWithGoogle}
            size="lg"
            className="w-full"
          >
            Sign in with Google
          </Button>
          <p className="text-xs text-muted-foreground">
            We use your first name to personalize your experience.
          </p>
        </div>

        {/* Footer link */}
        <div className="border-t border-border pt-6">
          <a href="/about" className="text-sm text-promoter underline-offset-4 hover:underline">
            Learn about getChimed →
          </a>
        </div>
      </div>
    </div>
  )
}
