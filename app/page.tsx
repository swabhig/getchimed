"use client"

import { useState } from "react"
import { BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { UploadScreen } from "@/components/upload-screen"
import { ResultsScreen } from "@/components/results-screen"
import { ExportScreen } from "@/components/export-screen"
import { mockAnalysis, type AnalysisResult } from "@/lib/nps-data"

type Step = "upload" | "results" | "export"

const steps: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "results", label: "Analysis" },
  { key: "export", label: "Export" },
]

export default function Page() {
  const [step, setStep] = useState<Step>("upload")
  const [analysis, setAnalysis] = useState<AnalysisResult>(mockAnalysis)
  const activeIndex = steps.findIndex((s) => s.key === step)

  return (
    <main className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BarChart3 className="size-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">NPS Insight Engine</span>
          </div>
          <nav aria-label="Progress" className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    i === activeIndex
                      ? "bg-muted text-foreground"
                      : i < activeIndex
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full text-[10px] tabular-nums",
                      i <= activeIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </span>
                {i < steps.length - 1 && <span className="h-px w-4 bg-border" aria-hidden />}
              </div>
            ))}
          </nav>
        </div>
      </header>

      {step === "upload" && (
        <UploadScreen
          onAnalyze={(data) => {
            setAnalysis(data)
            setStep("results")
          }}
        />
      )}
      {step === "results" && (
        <ResultsScreen data={analysis} onExport={() => setStep("export")} onReset={() => setStep("upload")} />
      )}
      {step === "export" && <ExportScreen data={analysis} onBack={() => setStep("results")} />}
    </main>
  )
}
