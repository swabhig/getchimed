import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Privacy Policy — Chime",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-svh bg-background">
      <div className="border-b border-border px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to app
        </Link>
      </div>

      <main className="mx-auto max-w-[640px] px-6 py-16">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
        <p className="mt-1 text-xs text-muted-foreground">Last updated: July 2026</p>

        <div className="mt-5 space-y-3.5 text-sm leading-relaxed text-foreground">
          <p>
            Chime analyzes NPS survey feedback you upload. We collect your name and email (via Google
            Sign-In), the survey data you upload, and basic usage data needed to save your analyses.
          </p>
          <p>
            Survey responses are sent to Anthropic's Claude API to generate your analysis. Data is stored
            with Supabase. <strong>We don't sell your data or use it to train models, and never for
            advertising.</strong> You can request deletion at any time.
          </p>
          <p>
            Third parties involved: Google (sign-in), Supabase (storage), Anthropic (analysis) — each
            governed by their own privacy practices.
          </p>
          <p>
            This is a basic policy for an early-stage tool and may be updated as Chime grows. Questions?
            Email{" "}
            <a href="mailto:hello@getchimed.site" className="text-brand-accent font-semibold hover:underline">
              hello@getchimed.site
            </a>
            .
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-6 mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to app
          </Link>
          <Link href="/terms" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Terms of Service →
          </Link>
        </div>
      </main>
    </div>
  )
}
