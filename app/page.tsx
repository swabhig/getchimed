"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { UploadScreen } from "@/components/upload-screen"
import { ResultsScreen } from "@/components/results-screen"
import { ExportScreen } from "@/components/export-screen"
import { Sidebar } from "@/components/sidebar"
import { Footer } from "@/components/footer"
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
  const [userChanged, setUserChanged] = useState(false)
  const activeIndex = steps.findIndex((s) => s.key === step)

  useEffect(() => {
    let mounted = true

    const getUser = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        
        if (mounted) {
          if (user) {
            setUser(user)
            setUserChanged(true)
          } else {
            setUser(null)
          }
        }
      } catch (error) {
        console.error("[v0] Failed to get user:", error)
      }
    }

    getUser()

    return () => {
      mounted = false
    }
  }, [])

  // Save analysis when user authenticates and we have pending analysis
  useEffect(() => {
    if (userChanged && user && step === "results") {
      const saveAnalysis = async () => {
        try {
          const supabase = createClient()
          const { error } = await supabase.from("user_analyses").insert({
            user_id: user.id,
            analysis_data: analysis,
          })

          if (error) {
            console.error("[v0] Failed to save analysis:", error)
          } else {
            console.log("[v0] Analysis saved successfully")
          }
        } catch (error) {
          console.error("[v0] Error saving analysis:", error)
        }
      }

      saveAnalysis()
      setUserChanged(false)
    }
  }, [userChanged, user, analysis, step])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setStep("upload")
  }

  return (
    <div className="flex flex-col min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="font-bold text-lg tracking-tight text-foreground">
            getChimed <span className="text-xs font-normal text-muted-foreground">MVP • Beta</span>
          </div>
          
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
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - show only when user is authenticated and not on upload screen */}
        {user && step !== "upload" && (
          <Sidebar
            user={user}
            onSelectAnalysis={(analysis) => {
              setAnalysis(analysis)
              setStep("results")
            }}
            onSignOut={handleSignOut}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto flex flex-col">
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

          <Footer />
        </main>
      </div>
    </div>
  )
}
