"use client"

import { useState } from "react"
import { ArrowRight, X, Bug, Zap, LifeBuoy, TrendingUp, Wrench, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WordCloud } from "@/components/word-cloud"
import type { AnalysisResult, FlagCategory, Theme, BenchmarkResponse } from "@/lib/nps-data"

interface ResultsScreenProps {
  data: AnalysisResult
  onExport: () => void
  onReset: () => void
}

const metricConfig = [
  { key: "promoter", label: "Promoters", dot: "bg-promoter", value: "text-promoter", sub: "Score 9–10" },
  { key: "passive", label: "Passives", dot: "bg-passive", value: "text-passive", sub: "Score 7–8" },
  { key: "detractor", label: "Detractors", dot: "bg-detractor", value: "text-detractor", sub: "Score 0–6" },
] as const

const flagMeta: Record<FlagCategory, { label: string; icon: typeof Bug; className: string }> = {
  bug: { label: "Bug", icon: Bug, className: "bg-detractor-muted text-detractor" },
  friction: { label: "Friction", icon: Zap, className: "bg-passive-muted text-passive" },
  support: { label: "Support", icon: LifeBuoy, className: "bg-muted text-muted-foreground" },
}

function getBenchmarkBadgeColor(sentiment: BenchmarkResponse["sentiment"]) {
  switch (sentiment) {
    case "excellent":
    case "above-benchmark":
      return "bg-promoter-muted text-promoter"
    case "at-benchmark":
      return "bg-promoter-muted/50 text-promoter"
    case "below-benchmark":
    case "needs-attention":
      return "bg-detractor-muted text-detractor"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function ResultsScreen({ data, onExport, onReset }: ResultsScreenProps) {
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null)

  const promoterThemes = data.themes.filter((t) => t.segment === "promoter")
  const passiveThemes = data.themes.filter((t) => t.segment === "passive")

  const visibleRows = activeTheme
    ? data.responses.filter((r) => activeTheme.rowRefs.includes(r.id))
    : data.responses

  function handleSelect(theme: Theme) {
    setActiveTheme((cur) => (cur?.label === theme.label ? null : theme))
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Analysis results</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Based on {data.responses.length} responses. Click any theme to see the comments behind it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset}>
            New import
          </Button>
          <Button onClick={onExport}>
            Export
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </header>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metricConfig.map((m) => (
          <div key={m.key} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", m.dot)} />
              <span className="text-sm font-medium text-muted-foreground">{m.label}</span>
            </div>
            <p className={cn("mt-3 text-4xl font-semibold tabular-nums", m.value)}>{data.metrics[m.key]}%</p>
            <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Benchmark badge */}
      {data.benchmark && (
        <div className="mt-6 rounded-lg border border-border bg-card p-5">
          <div className="flex items-start gap-4">
            <div className={cn("rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2", getBenchmarkBadgeColor(data.benchmark.sentiment))}>
              <AlertCircle className="size-4" />
              {data.benchmark.remark}
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                Industry benchmark: <span className="font-medium">{data.benchmark.source}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Word clouds */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <WordCloud
          title="Promoter themes"
          segment="promoter"
          themes={promoterThemes}
          activeLabel={activeTheme?.segment === "promoter" ? activeTheme.label : null}
          onSelect={handleSelect}
        />
        <WordCloud
          title="Passive themes"
          segment="passive"
          themes={passiveThemes}
          activeLabel={activeTheme?.segment === "passive" ? activeTheme.label : null}
          onSelect={handleSelect}
        />
      </div>

      {/* Flags */}
      <section className="mt-6 rounded-lg border border-border bg-card p-5" aria-label="Detractor flags">
        <div className="mb-4 flex items-center gap-2">
          <span className="size-2 rounded-full bg-detractor" />
          <h3 className="text-sm font-medium text-foreground">Flags — detractor comments</h3>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {data.flags.map((flag) => {
            const meta = flagMeta[flag.category]
            const Icon = meta.icon
            return (
              <li key={flag.rowRef} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                    meta.className,
                  )}
                >
                  <Icon className="size-3" />
                  {meta.label}
                </span>
                <p className="text-sm text-foreground">{flag.comment}</p>
                <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">#{flag.rowRef}</span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Responses table */}
      <section className="mt-6 rounded-lg border border-border bg-card" aria-label="Responses">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
          <h3 className="text-sm font-medium text-foreground">
            Responses <span className="text-muted-foreground">({visibleRows.length})</span>
          </h3>
          {activeTheme && (
            <button
              type="button"
              onClick={() => setActiveTheme(null)}
              className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/70"
            >
              Filtered by “{activeTheme.label}”
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="w-16 px-4 py-2.5 font-medium">Score</th>
                <th className="px-4 py-2.5 font-medium">Comment</th>
                <th className="hidden w-32 px-4 py-2.5 font-medium sm:table-cell">Persona</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-flex size-7 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
                        row.score >= 9
                          ? "bg-promoter-muted text-promoter"
                          : row.score >= 7
                            ? "bg-passive-muted text-passive"
                            : "bg-detractor-muted text-detractor",
                      )}
                    >
                      {row.score}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-foreground">{row.comment}</td>
                  <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">{row.persona}</td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No responses match this theme.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Action list */}
      <section className="mt-6 rounded-lg border border-border bg-card" aria-label="Action list">
        <div className="border-b border-border p-4">
          <h3 className="text-sm font-medium text-foreground">Action list</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Prioritized themes with an owner and mention count.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Theme</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Team</th>
                <th className="w-28 px-4 py-2.5 text-right font-medium">Mentions</th>
              </tr>
            </thead>
            <tbody>
              {data.actionList.map((item) => {
                const isDoubleDown = item.category === "double-down"
                const Icon = isDoubleDown ? TrendingUp : Wrench
                return (
                  <tr key={item.theme} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground capitalize">{item.theme}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                          isDoubleDown ? "bg-promoter-muted text-promoter" : "bg-passive-muted text-passive",
                        )}
                      >
                        <Icon className="size-3" />
                        {isDoubleDown ? "Double down" : "Fix blocker"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.team}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">{item.mentions}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
