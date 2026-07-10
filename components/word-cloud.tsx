"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import type { Segment, Theme } from "@/lib/nps-data"

interface WordCloudProps {
  title: string
  segment: Segment
  themes: Theme[]
  activeLabel: string | null
  onSelect: (theme: Theme) => void
}

declare global {
  interface Window {
    WordCloud?: any
  }
}

const segmentColors: Record<Segment, string[]> = {
  promoter: ["#16a34a", "#22c55e", "#4ade80", "#86efac"],
  passive: ["#ca8a04", "#eab308", "#facc15", "#fde047"],
  detractor: ["#dc2626", "#ef4444", "#f87171", "#fca5a5"],
}

const segmentText: Record<Segment, string> = {
  promoter: "text-promoter",
  passive: "text-passive",
  detractor: "text-detractor",
}

export function WordCloud({ title, segment, themes, activeLabel, onSelect }: WordCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load wordcloud2.js from CDN
    if (window.WordCloud) {
      renderCloud()
      return
    }

    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/wordcloud2.js/1.0.6/wordcloud2.min.js"
    script.async = true
    script.onload = () => {
      renderCloud()
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [themes, activeLabel])

  function renderCloud() {
    if (!canvasRef.current || !window.WordCloud || themes.length === 0) return

    console.log("[v0] WordCloud rendering", themes.length, "themes for", segment)

    const colors = segmentColors[segment]
    const minFreq = Math.min(...themes.map((t) => t.frequency))
    const maxFreq = Math.max(...themes.map((t) => t.frequency))

    // Font-size bounds (in px). Normalize each frequency into this range so the
    // biggest word can't swallow the whole canvas and the smallest stays legible.
    const MIN_FONT = 16
    const MAX_FONT = 48
    const range = maxFreq - minFreq

    // Prepare data for wordcloud2: [word, sizeInPx, theme] tuples.
    // The size here is already the final pixel size, so weightFactor stays at 1.
    const data = themes.map((theme) => {
      const isActive = activeLabel === theme.label
      // When every theme shares the same frequency, range is 0 — fall back to a mid size.
      const normalized = range === 0 ? 0.5 : (theme.frequency - minFreq) / range
      let size = MIN_FONT + normalized * (MAX_FONT - MIN_FONT)
      if (isActive) size *= 1.25
      return [theme.label, size, theme]
    })

    try {
      window.WordCloud([canvasRef.current], {
        list: data,
        gridSize: 4,
        weightFactor: 1,
        minSize: MIN_FONT,
        rotateRatio: 0.35,
        rotationSteps: 2,
        shrinkToFit: true,
        drawOutOfBound: false,
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontWeight: "600",
        color: () => colors[Math.floor(Math.random() * colors.length)],
        click: (item: any) => {
          const theme = themes.find((t) => t.label === item[0])
          if (theme) onSelect(theme)
        },
      })
    } catch (err) {
      console.error("WordCloud2 rendering error:", err)
    }
  }

  if (themes.length === 0) {
    return (
      <section
        className="rounded-lg border border-border bg-card p-5"
        aria-label={title}
      >
        <div className="mb-4 flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              segment === "promoter" ? "bg-promoter" : segment === "passive" ? "bg-passive" : "bg-detractor"
            )}
          />
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">No themes available.</p>
      </section>
    )
  }

  return (
    <section
      ref={containerRef}
      className="rounded-lg border border-border bg-card p-5"
      aria-label={title}
    >
      <div className="mb-4 flex items-center gap-2">
        <span
          className={cn(
            "size-2 rounded-full",
            segment === "promoter" ? "bg-promoter" : segment === "passive" ? "bg-passive" : "bg-detractor"
          )}
        />
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <canvas
        ref={canvasRef}
        width={520}
        height={320}
        className="mx-auto block max-w-full"
        style={{ cursor: "pointer" }}
      />
    </section>
  )
}
