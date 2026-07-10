"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
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
  const [user, setUser] = useState<any>(null)
  const activeIndex = steps.findIndex((s) => s.key === step)

  useEffect(() => {
    const supabase = createClient()
    
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      if (user) {
        setUser(user)
      }
    }

    getUser()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setStep("upload")
  }

  return (
    <main className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="font-bold text-lg tracking-tight text-foreground">getChimed</div>
          
          {step !== "upload" && (
            <nav aria-label="Progress" className="hidden sm:flex items-center gap-2">
              {steps.map((s, i) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                      i === activeIndex
                        ? "bg-muted text-foreground"
                        : i < activeIndex
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-full text-[10px] font-semibold",
                        i <= activeIndex ? "bg-black text-white" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span>{s.label}</span>
                  </span>
                  {i < steps.length - 1 && <span className="h-px w-3 bg-border" aria-hidden />}
                </div>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-4">
            <Link
              href="/about"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
            {user && (
              <button
                onClick={handleSignOut}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      {step === "upload" && (
        <UploadScreen
          user={user}
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
