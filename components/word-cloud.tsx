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

// Same props interface as before — this component is a drop-in replacement.
// Per the Claude Design handoff: no canvas/wordcloud2.js. Each theme renders
// as a plain <span>-like button, sized/weighted/opacity by frequency
// (normalized per segment), colored by segment, with the active theme in the
// brand accent color + underline. Simpler, no CDN dependency, no
// click-hit-testing against a canvas.

const segmentDotClass: Record<Segment, string> = {
  promoter: "bg-promoter",
  passive: "bg-passive",
  detractor: "bg-detractor",
}

const segmentTextClass: Record<Segment, string> = {
  promoter: "text-promoter",
  passive: "text-passive",
  detractor: "text-detractor",
}

export function WordCloud({ title, segment, themes, activeLabel, onSelect }: WordCloudProps) {
  if (themes.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5" aria-label={title}>
        <div className="mb-4 flex items-center gap-2">
          <span className={cn("size-2 rounded-full", segmentDotClass[segment])} />
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">No themes available.</p>
      </section>
    )
  }

  const freqs = themes.map((t) => t.frequency)
  const min = Math.min(...freqs)
  const max = Math.max(...freqs)
  const range = max - min || 1

  return (
    <section className="rounded-2xl border border-border bg-card p-5" aria-label={title}>
      <div className="mb-4 flex items-center gap-2">
        <span className={cn("size-2 rounded-full", segmentDotClass[segment])} />
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        {themes.map((theme) => {
          const normalized = (theme.frequency - min) / range
          const isActive = activeLabel === theme.label
          const fontSize = 15 + normalized * 21 // 15px – 36px
          const fontWeight = isActive ? 800 : 500 + Math.round(normalized * 200) // 500 – 700
          const opacity = isActive ? 1 : 0.55 + normalized * 0.45

          return (
            <button
              key={theme.label}
              type="button"
              onClick={() => onSelect(theme)}
              style={{
                fontSize: `${fontSize}px`,
                fontWeight,
                opacity,
                lineHeight: 1.15,
              }}
              className={cn(
                "cursor-pointer bg-transparent border-none p-0 font-sans transition-[color,opacity]",
                isActive ? "text-brand-accent underline underline-offset-4" : segmentTextClass[segment],
              )}
            >
              {theme.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
