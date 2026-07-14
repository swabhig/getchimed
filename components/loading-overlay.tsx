"use client"

import { cn } from "@/lib/utils"

interface LoadingOverlayProps {
  status: "inserting" | "analyzing" | "benchmarking"
  firstName?: string
}

const steps = [
  { key: "inserting", label: "Saving responses" },
  { key: "analyzing", label: "Clustering themes" },
  { key: "benchmarking", label: "Benchmarking" },
] as const

const stepOrder: Record<string, number> = { inserting: 0, analyzing: 1, benchmarking: 2 }

// Full-screen loading state shown between clicking Analyze and the results
// screen rendering. Unlike the original Claude Design mock (which advanced
// its 3 steps on a fixed timer), this is wired to the real status coming
// from upload-screen.tsx's actual request sequence — each step lights up
// only once that request has genuinely started/completed.
export function LoadingOverlay({ status, firstName }: LoadingOverlayProps) {
  const currentIndex = stepOrder[status] ?? 0

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="size-10 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      <p className="mt-5 text-sm font-medium text-foreground">
        {firstName ? `Reading your responses, ${firstName}…` : "Reading your responses…"}
      </p>
      <ul className="mt-6 flex flex-col gap-2">
        {steps.map((step, i) => (
          <li
            key={step.key}
            className={cn(
              "flex items-center gap-2 text-sm transition-colors",
              i < currentIndex && "text-muted-foreground",
              i === currentIndex && "font-medium text-foreground",
              i > currentIndex && "text-muted-foreground/50",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                i <= currentIndex ? "bg-brand-accent" : "bg-muted-foreground/30",
              )}
            />
            {step.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
