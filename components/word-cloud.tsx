"use client"

import { cn } from "@/lib/utils"
import type { Segment, Theme } from "@/lib/nps-data"

interface WordCloudProps {
  title: string
  segment: Segment
  themes: Theme[]
  activeLabel: string | null
  onSelect: (theme: Theme) => void
}

// Map a frequency to a font size, relative to the panel's min/max.
function sizeFor(freq: number, min: number, max: number) {
  if (max === min) return 1.4
  const t = (freq - min) / (max - min)
  return 0.9 + t * 1.7 // rem
}

const segmentText: Record<Segment, string> = {
  promoter: "text-promoter",
  passive: "text-passive",
  detractor: "text-detractor",
}

const segmentActive: Record<Segment, string> = {
  promoter: "bg-promoter text-promoter-foreground",
  passive: "bg-passive text-passive-foreground",
  detractor: "bg-detractor text-detractor-foreground",
}

export function WordCloud({ title, segment, themes, activeLabel, onSelect }: WordCloudProps) {
  const freqs = themes.map((t) => t.frequency)
  const min = Math.min(...freqs)
  const max = Math.max(...freqs)

  // Interleave big/small so large words distribute across the cloud (organic packing).
  const sorted = [...themes].sort((a, b) => b.frequency - a.frequency)
  const arranged: Theme[] = []
  let head = 0
  let tail = sorted.length - 1
  let takeHead = true
  while (head <= tail) {
    if (takeHead) arranged.push(sorted[head++])
    else arranged.push(sorted[tail--])
    takeHead = !takeHead
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5" aria-label={title}>
      <div className="mb-4 flex items-center gap-2">
        <span className={cn("size-2 rounded-full", segment === "promoter" ? "bg-promoter" : "bg-passive")} />
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2">
        {arranged.map((theme) => {
          const isActive = activeLabel === theme.label
          return (
            <button
              key={theme.label}
              type="button"
              onClick={() => onSelect(theme)}
              style={{ fontSize: `${sizeFor(theme.frequency, min, max)}rem` }}
              className={cn(
                "rounded-md px-2 py-0.5 font-semibold leading-tight transition-colors hover:opacity-70",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive ? segmentActive[segment] : segmentText[segment],
              )}
              title={`${theme.frequency} mentions`}
            >
              {theme.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
