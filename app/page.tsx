"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const activeIndex = steps.findIndex((s) => s.key === step)

  useEffect(() => {
    const supabase = createClient()
    
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      if (user) {
        setUser(user)
      } else {
        router.push("/auth/login")
      }
      setLoading(false)
    }

    getUser()
  }, [router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center space-y-2">
          <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-foreground">getChimed</span>
          </div>
          <nav aria-label="Progress" className="hidden sm:flex items-center gap-1.5">
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
                      i <= activeIndex ? "bg-promoter text-white" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span>{s.label}</span>
                </span>
                {i < steps.length - 1 && <span className="h-px w-4 bg-border" aria-hidden />}
              </div>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/about"
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
            <button
              onClick={handleSignOut}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
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
