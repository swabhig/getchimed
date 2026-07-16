"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { signInWithGooglePopup } from "@/lib/google-signin"
import { cn } from "@/lib/utils"
import { UploadScreen } from "@/components/upload-screen"
import { ResultsScreen } from "@/components/results-screen"
import { ExportScreen } from "@/components/export-screen"
import { Sidebar } from "@/components/sidebar"
import { mockAnalysis, type AnalysisResult } from "@/lib/nps-data"
import { getFirstName } from "@/lib/user"

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
  const [signingIn, setSigningIn] = useState(false)
  const activeIndex = steps.findIndex((s) => s.key === step)
  const lastSavedRef = useRef<AnalysisResult | null>(null)
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Keep `user` in sync with real auth state at all times — not just on
  // initial page load. This is what lets the sidebar and analysis-saving
  // logic react correctly to sign-in that happens via the popup flow
  // triggered mid-analyze, not just a normal full-page sign-in.
  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setUser(user ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // Single source of truth for saving an analysis, to the `user_analyses`
  // table the sidebar actually reads from. Guarded by lastSavedRef so the
  // same analysis object is never saved twice (e.g. on unrelated re-renders).
  useEffect(() => {
    if (!user || step !== "results") return
    if (lastSavedRef.current === analysis) return
    lastSavedRef.current = analysis

    const saveAnalysis = async () => {
      try {
        const supabase = createClient()
        const { error } = await supabase.from("user_analyses").insert({
          user_id: user.id,
          analysis_data: analysis,
        })
        if (error) {
          console.error("[chime] Failed to save analysis:", error)
        }
      } catch (error) {
        console.error("[chime] Error saving analysis:", error)
      }
    }

    saveAnalysis()
  }, [user, analysis, step])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setStep("upload")
  }

  async function handleSignIn() {
    setSigningIn(true)
    const user = await signInWithGooglePopup()
    if (user) setUser(user)
    setSigningIn(false)
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur shrink-0">
        <div className="flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-foreground">
            <img src="/icons/chime-icon-192.png" alt="Chime logo" className="size-7 rounded-md" />
            <span className="inline-flex items-baseline">
              Chime
              <span className="ml-0.5 size-1.5 rounded-full bg-brand-accent" />
            </span>
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
                        i <= activeIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
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

          <div className="flex items-center gap-3">
            <Link
              href="/about"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
            {!user && (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={signingIn}
                className="rounded-lg border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {signingIn ? "Signing in…" : "Sign in"}
              </button>
            )}
            {user && step === "upload" && (
              <span className="text-sm font-medium text-foreground">Hi, {getFirstName(user)}</span>
            )}
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar shell - hide on mobile, show on desktop */}
        {step !== "upload" && (
          <div className="hidden lg:flex lg:flex-col">
            <Sidebar
              user={user}
              onSelectAnalysis={(analysis) => {
                setAnalysis(analysis)
                setStep("results")
              }}
              onSignOut={handleSignOut}
              onSignedIn={(u) => setUser(u)}
            />
            </div>
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
              onSignedIn={(u) => setUser(u)}
            />
          )}
          {step === "results" && (
            <ResultsScreen
              data={analysis}
              onExport={() => setStep("export")}
              onReset={() => setStep("upload")}
              user={user}
            />
          )}
          {step === "export" && <ExportScreen data={analysis} onBack={() => setStep("results")} user={user} />}
        </main>
      </div>
    </div>
  )
}
