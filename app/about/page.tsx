import Link from "next/link"
import { ArrowLeft, BarChart3 } from "lucide-react"

export const metadata = {
  title: "About — NPS Insight Engine",
  description: "Why we built the NPS Insight Engine and the methodology behind it.",
}

export default function AboutPage() {
  return (
    <main className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BarChart3 className="size-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">NPS Insight Engine</span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to app
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
          Beyond the score.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
          A Net Promoter Score is a single number, but the story that matters lives in the comments behind it. The NPS
          Insight Engine reads every open-ended response, clusters them into themes, and turns them into a prioritized
          action list — so you know exactly what to double down on and what to fix next.
        </p>

        <h2 className="mt-10 text-lg font-semibold text-foreground">The methodology</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
          We segment respondents into promoters, passives, and detractors, then analyze what each group tells you.
          Promoters reveal the benefits worth amplifying. Passives point to the blockers keeping them from becoming
          advocates. Detractors surface the critical issues to route to the right team. This mirrors the
          product-market-fit engine popularized by Rahul Vohra at Superhuman: measure, segment, and systematically act
          on the feedback that moves your score.
        </p>

        <h2 className="mt-10 text-lg font-semibold text-foreground">How to use it</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
          Upload a CSV of your survey responses, map your columns, and add a little context about your business. In
          seconds you get benchmarked results, word clouds of the themes customers actually mention, and a huddle-ready
          summary you can paste straight into Slack or a doc.
        </p>
      </article>
    </main>
  )
}
