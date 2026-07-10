'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export default function LoginPage() {
  const { theme, setTheme } = useTheme()

  return (
    <>
      <style>{`
        @keyframes float-chime {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .animate-float-chime {
          display: inline-block;
          animation: float-chime 2.4s ease-in-out infinite;
        }
      `}</style>
      <div className="relative flex min-h-svh flex-col items-center justify-center px-4">
        <Link href="/" className="absolute left-5 top-5 flex items-center gap-2" aria-label="Chime home">
          <img src="/icons/chime-icon-192.png" alt="Chime logo" className="size-7 rounded-md" />
          <span className="inline-flex items-baseline font-bold text-base tracking-tight text-foreground">
            Chime
            <span className="ml-0.5 size-1.5 rounded-full bg-brand-accent" />
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="absolute right-5 top-5 flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        <div className="w-full max-w-sm space-y-10 text-center">
          {/* Hero headline */}
          <div className="space-y-5">
            <div className="space-y-1">
              <p className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl text-balance leading-tight">
                Beyond the score,
              </p>
              <p className="text-5xl font-black sm:text-6xl text-balance leading-tight text-brand-accent animate-float-chime">
                chime.
              </p>
            </div>
            <p className="text-2xl text-muted-foreground font-[family-name:var(--font-caveat)]">
              Upload → Map columns → See what matters
            </p>
            <p className="text-base leading-relaxed text-muted-foreground">
              Turn NPS feedback into action without losing the nuance in a spreadsheet.
            </p>
          </div>

          {/* CTA */}
          <div className="space-y-6 pt-2">
            <Link
              href="/auth/login/start"
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 text-base font-semibold text-background transition-all duration-200 hover:opacity-90 active:scale-95"
            >
              Get started →
            </Link>
          </div>

          {/* Footer link */}
          <div className="border-t border-border pt-8">
            <a href="/about" className="text-sm font-medium text-brand-accent underline-offset-4 hover:underline">
              Learn about Chimed →
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
