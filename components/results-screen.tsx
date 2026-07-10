"use client"

import { useState, useEffect } from "react"
import { ArrowRight, X, Bug, Zap, LifeBuoy, TrendingUp, Wrench, AlertCircle, Info, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WordCloud } from "@/components/word-cloud"
import type { AnalysisResult, FlagCategory, Theme } from "@/lib/nps-data"

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

const RESPONSES_PER_PAGE = 25

function responsesToCsv(data: AnalysisResult): string {
  const rows: string[][] = [["score", "main_benefit", "improvement", "persona"]]
  for (const r of data.responses) {
    rows.push([String(r.score), r.main_benefit ?? "", r.improvement ?? "", r.persona ?? ""])
  }
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
}

function SectionHeader({ title, tooltip }: { title: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-2 rounded-full bg-promoter" />
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <div className="group relative cursor-help">
        <Info className="size-3.5 text-muted-foreground hover:text-foreground" />
        <div className="pointer-events-none absolute left-0 top-full mt-1 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
          {tooltip}
        </div>
      </div>
    </div>
  )
}

export function ResultsScreen({ data, onExport, onReset }: ResultsScreenProps) {
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null)
  const [page, setPage] = useState(0)

  const promoterThemes = data.themes.filter((t) => t.segment === "promoter")
  const passiveThemes = data.themes.filter((t) => t.segment === "passive")

  const visibleRows = activeTheme
    ? data.responses.filter((r) => activeTheme.rowRefs.includes(r.id))
    : data.responses

  // Reset to first page whenever the filter or dataset changes
  useEffect(() => {
    setPage(0)
  }, [activeTheme, data])

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / RESPONSES_PER_PAGE))
  const currentPage = Math.min(page, totalPages - 1)
  const pagedRows = visibleRows.slice(
    currentPage * RESPONSES_PER_PAGE,
    currentPage * RESPONSES_PER_PAGE + RESPONSES_PER_PAGE,
  )

  function downloadFullCsv() {
    const blob = new Blob([responsesToCsv(data)], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "nps-responses.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleSelect(theme: Theme) {
    setActiveTheme((cur) => (cur?.label === theme.label ? null : theme))
  }

  // Calculate NPS score (promoter% - detractor%)
  const npsScore = data.metrics.promoter - data.metrics.detractor

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-10 flex flex-col items-center justify-center gap-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Analysis results</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Based on {data.responses.length} responses. Click any theme to see the comments behind it.
          </p>
        </div>
        
        {/* NPS Hero with Benchmark Badge */}
        <div className="flex flex-col items-center">
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">Your NPS Score</p>
          <p className="mt-2 text-6xl font-bold tracking-tight text-foreground">{npsScore}</p>
          
          {/* Benchmark link with animated tooltip */}
          {data.benchmark && (
            <div className="group relative mt-5 inline-flex justify-center">
              <a
                href={data.benchmark.sourceUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-promoter underline-offset-4 hover:underline focus:outline-none focus-visible:underline"
              >
                See industry benchmark &rarr;
              </a>
              <div
                role="tooltip"
                className={cn(
                  "pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 origin-bottom",
                  "scale-95 opacity-0 transition-all duration-200 ease-out",
                  "group-hover:scale-100 group-hover:opacity-100",
                  "group-focus-within:scale-100 group-focus-within:opacity-100",
                )}
              >
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-left shadow-lg">
                  <p className="text-xs leading-relaxed text-popover-foreground">{data.benchmark.remark}</p>
                  <p className="mt-1.5 text-xs font-medium text-muted-foreground">{data.benchmark.source}</p>
                </div>
              </div>
            </div>
          )}
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

      {/* Word clouds - collapsible, expanded by default */}
      <details className="mt-6 group" open>
        <summary className="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-border bg-card p-4 hover:bg-muted/50">
          <div className="flex items-center gap-2 flex-1">
            <span className="size-2 rounded-full bg-promoter" />
            <h3 className="text-sm font-medium text-foreground">Word clouds</h3>
            <div className="group/info relative cursor-help">
              <Info className="size-3.5 text-muted-foreground hover:text-foreground" />
              <div className="pointer-events-none absolute left-0 top-full mt-1 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover/info:block">
                Theme frequency across promoter and passive feedback.
              </div>
            </div>
          </div>
          <span className="text-muted-foreground transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
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
      </details>

      {/* Responses table - collapsible, expanded by default */}
      <details className="mt-6 group" open>
        <summary className="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-border bg-card p-4 hover:bg-muted/50">
          <div className="flex items-center gap-2 flex-1">
            <span className="size-2 rounded-full bg-promoter" />
            <h3 className="text-sm font-medium text-foreground">
              Responses <span className="text-muted-foreground">({visibleRows.length})</span>
            </h3>
            <div className="group/info relative cursor-help">
              <Info className="size-3.5 text-muted-foreground hover:text-foreground" />
              <div className="pointer-events-none absolute left-0 top-full mt-1 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover/info:block">
                Every survey response — filters when you click a word or fix.
              </div>
            </div>
          </div>
          <span className="text-muted-foreground transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="mt-3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            {activeTheme ? (
              <button
                type="button"
                onClick={() => setActiveTheme(null)}
                className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/70"
              >
                Filtered by "{activeTheme.label}"
                <X className="size-3.5" />
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={downloadFullCsv}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Download className="size-3.5" />
              Download full CSV
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/50">
                  <th className="w-16 px-4 py-2.5 font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">Main benefit</th>
                  <th className="px-4 py-2.5 font-medium">Improvement</th>
                  <th className="hidden w-32 px-4 py-2.5 font-medium sm:table-cell">Persona</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
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
                    <td className="px-4 py-2.5 text-foreground">{row.main_benefit}</td>
                    <td className="px-4 py-2.5 text-foreground">{row.improvement}</td>
                    <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">{row.persona}</td>
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No responses match this theme.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {visibleRows.length > RESPONSES_PER_PAGE && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="rounded-md border border-border px-3 py-1.5 font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="rounded-md border border-border px-3 py-1.5 font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </details>

      {/* Fixes by team - collapsible, expanded by default */}
      <details className="mt-6 group" open>
        <summary className="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-border bg-card p-4 hover:bg-muted/50">
          <div className="flex items-center gap-2 flex-1">
            <span className="size-2 rounded-full bg-promoter" />
            <h3 className="text-sm font-medium text-foreground">Fixes by team</h3>
            <div className="group/info relative cursor-help">
              <Info className="size-3.5 text-muted-foreground hover:text-foreground" />
              <div className="pointer-events-none absolute left-0 top-full mt-1 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover/info:block">
                Prioritized actions per team, ranked by impact.
              </div>
            </div>
          </div>
          <span className="text-muted-foreground transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/50">
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
      </details>

      {/* Detractor flags - collapsible, collapsed by default */}
      <details className="mt-6 group">
        <summary className="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-border bg-card p-4 hover:bg-muted/50">
          <div className="flex items-center gap-2 flex-1">
            <span className="size-2 rounded-full bg-detractor" />
            <h3 className="text-sm font-medium text-foreground">Detractor flags</h3>
            <div className="group/info relative cursor-help">
              <Info className="size-3.5 text-muted-foreground hover:text-foreground" />
              <div className="pointer-events-none absolute left-0 top-full mt-1 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover/info:block">
                Critical issues reported by detractors, categorized by type.
              </div>
            </div>
          </div>
          <span className="text-muted-foreground transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="mt-3 rounded-lg border border-border bg-card p-4">
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
        </div>
      </details>



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
