"use client"

import { useState, useEffect } from "react"
import { ArrowRight, X, Bug, Zap, LifeBuoy, TrendingUp, Wrench, Info, Download, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WordCloud } from "@/components/word-cloud"
import { getFirstName } from "@/lib/user"
import type { AnalysisResult, FlagCategory, Theme, Flag as FlagType } from "@/lib/nps-data"

// Kept lucide-react icons rather than removing them for plain CSS shapes —
// per the Claude Design handoff's note, this is an explicit, simpler choice
// (restyle in place vs. a bigger icon-removal diff). Revisit if a fully
// icon-free look is wanted later.

interface ResultsScreenProps {
  data: AnalysisResult
  onExport: () => void
  onReset: () => void
  user?: any
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

const teamForCategory: Record<FlagCategory, string> = {
  bug: "Engineering",
  support: "Support",
  friction: "Product",
}

const flagFilterOrder: (FlagCategory | "all")[] = ["all", "bug", "friction", "support"]

const RESPONSES_PER_PAGE = 15
const MAX_NAVIGABLE_PAGES = 5

function rowsToCsv(rows: AnalysisResult["responses"]): string {
  const out: string[][] = [["score", "main_benefit", "improvement", "persona"]]
  for (const r of rows) {
    out.push([String(r.score), r.main_benefit ?? "", r.improvement ?? "", r.persona ?? ""])
  }
  return out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
}

function getNpsRemark(score: number): string {
  if (score < 0) return "There's real work to do here — the flags below point to what's breaking trust."
  if (score < 30) return "A reasonable starting point — the fixes below show the fastest path up."
  if (score < 50) return "Solid footing — lean into what's already working."
  return "Excellent — customers are clearly bought in."
}

function segmentBadgeClass(score: number): string {
  if (score >= 9) return "bg-promoter-muted text-promoter"
  if (score >= 7) return "bg-passive-muted text-passive"
  return "bg-detractor-muted text-detractor"
}

function CollapsibleSection({
  title,
  tooltip,
  dotClassName = "bg-promoter",
  open,
  onToggle,
  children,
}: {
  title: string
  tooltip: string
  dotClassName?: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const [infoHover, setInfoHover] = useState(false)

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer select-none items-center gap-2 rounded-2xl border border-border bg-card p-4 text-left hover:bg-muted/50"
      >
        <div className="flex flex-1 items-center gap-2">
          <span className={cn("size-2 rounded-full", dotClassName)} />
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <div
            className="relative cursor-help"
            onMouseEnter={() => setInfoHover(true)}
            onMouseLeave={() => setInfoHover(false)}
          >
            <Info className="size-3.5 text-muted-foreground hover:text-foreground" />
            {infoHover && (
              <div className="pointer-events-none absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg">
                {tooltip}
              </div>
            )}
          </div>
        </div>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}

export function ResultsScreen({ data, onExport, onReset, user }: ResultsScreenProps) {
  const [activeTheme, setActiveTheme] = useState<Theme | { label: string; rowRefs: string[] } | null>(null)
  const [page, setPage] = useState(0)
  const [benchmarkHover, setBenchmarkHover] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [openSections, setOpenSections] = useState({ wordClouds: true, responses: true, fixes: true, flags: false })
  const [flagFilter, setFlagFilter] = useState<FlagCategory | "all">("all")
  const [selectedFlag, setSelectedFlag] = useState<FlagType | null>(null)
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)

  const promoterThemes = data.themes.filter((t) => t.segment === "promoter")
  const passiveThemes = data.themes.filter((t) => t.segment === "passive")

  const visibleRows = activeTheme ? data.responses.filter((r) => activeTheme.rowRefs.includes(r.id)) : data.responses

  useEffect(() => {
    setPage(0)
  }, [activeTheme, data])

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / RESPONSES_PER_PAGE))
  const maxPage = Math.min(totalPages, MAX_NAVIGABLE_PAGES)
  const currentPage = Math.min(page, maxPage - 1)
  const pagedRows = visibleRows.slice(
    currentPage * RESPONSES_PER_PAGE,
    currentPage * RESPONSES_PER_PAGE + RESPONSES_PER_PAGE,
  )

  function downloadCsv(rows: AnalysisResult["responses"], filename: string) {
    const blob = new Blob([rowsToCsv(rows)], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleSelectTheme(theme: Theme) {
    setActiveTheme((cur) => (cur?.label === theme.label ? null : theme))
    setOpenSections((s) => ({ ...s, responses: true }))
  }

  function handleSelectFix(item: (typeof data.actionList)[number]) {
    const theme = { label: item.theme, rowRefs: item.rowRefs }
    setActiveTheme((cur) => (cur?.label === theme.label ? null : theme))
    setOpenSections((s) => ({ ...s, responses: true }))
  }

  function toggleSection(key: keyof typeof openSections) {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }))
  }

  const npsScore = data.metrics.promoter - data.metrics.detractor

  const visibleFlags = data.flags.filter((f) => flagFilter === "all" || f.category === flagFilter)
  const selectedFlagResponse = selectedFlag ? data.responses.find((r) => r.id === selectedFlag.rowRef) : null

  // Group action items by team for the "Fixes by team" cards.
  const teamGroups: { team: string; items: AnalysisResult["actionList"] }[] = []
  const teamMap: Record<string, AnalysisResult["actionList"]> = {}
  for (const item of data.actionList) {
    if (!teamMap[item.team]) {
      teamMap[item.team] = []
      teamGroups.push({ team: item.team, items: teamMap[item.team] })
    }
    teamMap[item.team].push(item)
  }
  const highImpactThreshold = 20

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
      {/* Utility row */}
      <div className="mb-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← New import
        </button>
        <Button onClick={onExport}>
          Export results
          <ArrowRight className="size-4" />
        </Button>
      </div>

      {/* Guest banner */}
      {!user && !bannerDismissed && (
        <div className="mb-7 flex items-center gap-3 rounded-2xl bg-muted px-4 py-3">
          <span className="flex-1 text-sm text-foreground">
            You're viewing as a guest — sign in to save this analysis and pick up where you left off.
          </span>
          <Button size="sm" className="shrink-0">
            Sign in
          </Button>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* HERO */}
      <header className="mb-10 flex flex-col items-center text-center">
        {user && (
          <p className="mb-1.5 text-sm font-medium text-foreground">Nice work, {getFirstName(user)} 👋</p>
        )}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Based on {data.responses.length} responses
        </p>
        <p className="mt-5 text-xs uppercase tracking-wide text-muted-foreground">Your NPS score</p>
        <p className="mt-1.5 text-[64px] font-extrabold leading-none tracking-tight text-foreground sm:text-[88px]">
          {npsScore}
        </p>
        <p className="mt-3.5 max-w-sm text-sm text-muted-foreground">{getNpsRemark(npsScore)}</p>

        {data.benchmark && (
          <div
            className="relative mt-1 inline-flex justify-center"
            onMouseEnter={() => setBenchmarkHover(true)}
            onMouseLeave={() => setBenchmarkHover(false)}
          >
            <a
              href={data.benchmark.sourceUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-brand-accent no-underline hover:underline"
            >
              See industry benchmark →
            </a>
            {benchmarkHover && (
              <div className="absolute bottom-full left-1/2 z-10 mb-2 w-72 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2.5 text-left shadow-lg">
                <p className="text-xs leading-relaxed text-popover-foreground">{data.benchmark.remark}</p>
                <p className="mt-1.5 text-xs font-medium text-muted-foreground">{data.benchmark.source}</p>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {metricConfig.map((m) => (
          <div key={m.key} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", m.dot)} />
              <span className="text-sm font-medium text-muted-foreground">{m.label}</span>
            </div>
            <p className={cn("mt-3 text-4xl font-semibold tabular-nums", m.value)}>{data.metrics[m.key]}%</p>
            <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* RAW SIGNAL tier */}
      <p className="mt-8 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Raw signal</p>

      <CollapsibleSection
        title="Word clouds"
        tooltip="Theme frequency across promoter and passive feedback."
        open={openSections.wordClouds}
        onToggle={() => toggleSection("wordClouds")}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <WordCloud
            title="What they love"
            segment="promoter"
            themes={promoterThemes}
            activeLabel={activeTheme?.label ?? null}
            onSelect={handleSelectTheme}
          />
          <WordCloud
            title="What's holding them back"
            segment="passive"
            themes={passiveThemes}
            activeLabel={activeTheme?.label ?? null}
            onSelect={handleSelectTheme}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title={`Responses (${visibleRows.length})`}
        tooltip="Every survey response — filters when you click a word or fix."
        open={openSections.responses}
        onToggle={() => toggleSection("responses")}
      >
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
            onClick={() => downloadCsv(data.responses, "nps-responses.csv")}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            <Download className="size-3.5" />
            Download all {data.responses.length} responses
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
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
                        segmentBadgeClass(row.score),
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
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="rounded-md border border-border px-3 py-1.5 font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(maxPage - 1, p + 1))}
                  disabled={currentPage >= maxPage - 1}
                  className="rounded-md border border-border px-3 py-1.5 font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Navigation is capped at MAX_NAVIGABLE_PAGES — on the actual
                last reachable page (whether that's page 3 of 3, or page 5
                of 20), offer a direct download instead of more clicking. */}
            {currentPage === maxPage - 1 && (
              <div className="relative self-end">
                <button
                  type="button"
                  onClick={() => setDownloadMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/70"
                >
                  <Download className="size-3.5" />
                  {totalPages > MAX_NAVIGABLE_PAGES
                    ? `${totalPages - MAX_NAVIGABLE_PAGES} more pages — download instead?`
                    : "Download these responses"}
                  <ChevronDown className={cn("size-3.5 transition-transform", downloadMenuOpen && "rotate-180")} />
                </button>
                {downloadMenuOpen && (
                  <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-md border border-border bg-popover py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        downloadCsv(data.responses, "nps-responses-all.csv")
                        setDownloadMenuOpen(false)
                      }}
                      className="block w-full px-3 py-2 text-left text-xs text-popover-foreground hover:bg-muted"
                    >
                      Download all {data.responses.length} responses
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadCsv(visibleRows, "nps-responses-filtered.csv")
                        setDownloadMenuOpen(false)
                      }}
                      disabled={!activeTheme}
                      className="block w-full px-3 py-2 text-left text-xs text-popover-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {activeTheme
                        ? `Download filtered (${visibleRows.length}) responses`
                        : "Download with current filter (no filter active)"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* SO WHAT DO WE DO tier */}
      <p className="mt-9 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        So what do we do
      </p>

      <CollapsibleSection
        title="Fixes by team"
        tooltip="Prioritized actions per team, ranked by impact."
        open={openSections.fixes}
        onToggle={() => toggleSection("fixes")}
      >
        <div className="grid grid-cols-1 gap-3 rounded-2xl border-2 border-brand-accent/30 bg-card p-1 sm:grid-cols-2">
          {teamGroups.map((group) => (
            <div key={group.team} className="rounded-xl p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">{group.team}</p>
              <div className="flex flex-col divide-y divide-border">
                {group.items.map((item) => {
                  const isDoubleDown = item.category === "double-down"
                  const Icon = isDoubleDown ? TrendingUp : Wrench
                  const isHighImpact = item.mentions >= highImpactThreshold
                  const isActive = activeTheme?.label === item.theme
                  return (
                    <button
                      key={item.theme}
                      type="button"
                      onClick={() => handleSelectFix(item)}
                      className={cn(
                        "flex items-center gap-2.5 py-2.5 text-left first:pt-0 last:pb-0 hover:opacity-80",
                        isActive && "opacity-100",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                          isDoubleDown ? "bg-promoter-muted text-promoter" : "bg-passive-muted text-passive",
                        )}
                      >
                        <Icon className="size-3" />
                        {isDoubleDown ? "Double down" : "Fix blocker"}
                      </span>
                      <span className="flex-1 truncate text-sm font-medium capitalize text-foreground">
                        {item.theme}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-[11px] font-medium",
                          isHighImpact ? "text-brand-accent" : "text-muted-foreground",
                        )}
                      >
                        {isHighImpact ? "High impact" : "Low impact"}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.mentions}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* SUPPLEMENTARY tier */}
      <p className="mt-9 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Supplementary</p>

      <CollapsibleSection
        title={`Detractor flags (${data.flags.length})`}
        tooltip="Worth a glance — not weighted into the roadmap above."
        dotClassName="bg-detractor"
        open={openSections.flags}
        onToggle={() => toggleSection("flags")}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {flagFilterOrder.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFlagFilter(key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                flagFilter === key ? "bg-foreground text-background" : "bg-card border border-border text-foreground",
              )}
            >
              {key === "all" ? "All" : flagMeta[key].label}
            </button>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <ul className="flex flex-col divide-y divide-border">
            {visibleFlags.map((flag) => {
              const meta = flagMeta[flag.category]
              const Icon = meta.icon
              return (
                <li key={flag.rowRef}>
                  <button
                    type="button"
                    onClick={() => setSelectedFlag(flag)}
                    className="flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0 hover:opacity-80"
                  >
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                        meta.className,
                      )}
                    >
                      <Icon className="size-3" />
                      {meta.label}
                    </span>
                    <p className="flex-1 text-sm text-foreground">{flag.comment}</p>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">#{flag.rowRef}</span>
                  </button>
                </li>
              )
            })}
            {visibleFlags.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">No flags in this category.</li>
            )}
          </ul>
        </div>
      </CollapsibleSection>

      {/* Flag detail modal */}
      {selectedFlag && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedFlag(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                  flagMeta[selectedFlag.category].className,
                )}
              >
                {flagMeta[selectedFlag.category].label}
              </span>
              <button type="button" onClick={() => setSelectedFlag(null)} aria-label="Close">
                <X className="size-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <p className="text-sm text-foreground">{selectedFlag.comment}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-md text-xs font-semibold",
                  selectedFlagResponse ? segmentBadgeClass(selectedFlagResponse.score) : "bg-muted",
                )}
              >
                {selectedFlagResponse?.score ?? "—"}
              </span>
              <span>{selectedFlagResponse?.persona || "Unknown role"}</span>
              <span>·</span>
              <span>Suggested: {teamForCategory[selectedFlag.category]}</span>
            </div>
            <Button
              className="mt-5 w-full"
              onClick={() => {
                setActiveTheme({ label: `#${selectedFlag.rowRef}`, rowRefs: [selectedFlag.rowRef] })
                setOpenSections((s) => ({ ...s, responses: true }))
                setSelectedFlag(null)
              }}
            >
              View in responses
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
