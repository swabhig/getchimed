import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Terms of Service — Chime",
}

export default function TermsPage() {
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Terms of Service</h1>
        <p className="mt-1 text-xs text-muted-foreground">Last updated: July 2026</p>

        <div className="mt-5 space-y-3.5 text-sm leading-relaxed text-foreground">
          <p>
            By using Chime, you agree to these terms. Chime is an early-stage (beta) tool — please read
            this before uploading customer data.
          </p>
          <p>
            Chime analyzes NPS survey feedback you upload using AI to cluster responses into themes and
            generate insights. You're responsible for having the right to use and upload any data you
            provide. You retain ownership of it — we don't sell it or use it to train models beyond
            generating your analysis (see our Privacy Policy).
          </p>
          <p>
            Chime is under active development — features may change, and we can't guarantee uninterrupted
            availability or error-free results. Use your own judgment before acting on any analysis. The
            service is provided "as is," without warranties, and we aren't liable for decisions made based
            on its output.
          </p>
          <p>
            We may update these terms as the product evolves; continued use means you accept the changes.
            Questions? Email{" "}
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
          <Link href="/privacy" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Privacy Policy →
          </Link>
        </div>
      </main>
    </div>
  )
}
