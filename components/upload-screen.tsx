"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import Papa from "papaparse"
import { Upload, Link2, FileSpreadsheet, ArrowRight, Check, Loader2, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { LoadingOverlay } from "@/components/loading-overlay"
import { assembleAnalysis, segmentRows, type AnalysisResult, type ClusterResult, type ResponseRow, type BenchmarkContext, type BusinessType, type Model, type SurveyFrequency } from "@/lib/nps-data"

interface UploadScreenProps {
  user: any
  onAnalyze: (data: AnalysisResult) => void
}

type MappingKey = "score" | "main_benefit" | "improvement" | "persona"

function ColumnSelect({
  id,
  label,
  required,
  value,
  onChange,
  columns,
  error,
  errorMessage,
}: {
  id: string
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  columns: string[]
  error?: boolean
  errorMessage?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-detractor">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 rounded-md border bg-background px-3 text-sm text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          error ? "border-detractor ring-1 ring-detractor" : "border-input",
        )}
      >
        <option value="">Select a column…</option>
        {columns.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {error && errorMessage && <p className="text-xs text-detractor">{errorMessage}</p>}
    </div>
  )
}

export function UploadScreen({ user, onAnalyze }: UploadScreenProps) {
  const [source, setSource] = useState<"file" | "sheet">("file")
  const [fileName, setFileName] = useState<string | null>(null)
  const [sheetUrl, setSheetUrl] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [columns, setColumns] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<MappingKey, string>>({
    score: "",
    main_benefit: "",
    improvement: "",
    persona: "",
  })
  const [status, setStatus] = useState<"idle" | "parsing" | "inserting" | "analyzing" | "benchmarking">("idle")
  const [error, setError] = useState<string | null>(null)
  const [erroredField, setErroredField] = useState<MappingKey | null>(null)
  const [context, setContext] = useState<BenchmarkContext>({
    industry: "",
    businessType: "B2B",
    model: "SaaS",
    surveyFrequency: "First time",
  })
  const [showGoogleAuth, setShowGoogleAuth] = useState(false)
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false)
  const [pendingAnalysis, setPendingAnalysis] = useState<AnalysisResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasData = columns.length > 0 && rawRows.length > 0
  const canAnalyze =
    hasData &&
    mapping.score !== "" &&
    mapping.main_benefit !== "" &&
    mapping.improvement !== "" &&
    context.industry !== "" &&
    status === "idle"

  function parseFile(file: File) {
    setError(null)
    setErroredField(null)
    setStatus("parsing")
    setFileName(file.name)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? []
        const rows = results.data.filter((r) => Object.keys(r).length > 0)
        setColumns(headers)
        setRawRows(rows)
        setMapping({ score: "", main_benefit: "", improvement: "", persona: "" })
        setStatus("idle")
        if (rows.length === 0) setError("No rows found in this CSV.")
      },
      error: (err) => {
        setStatus("idle")
        setError(`Could not parse file: ${err.message}`)
      },
    })
  }

  function handleFiles(files: FileList | null) {
    if (files && files[0]) parseFile(files[0])
  }

  function setMap(key: MappingKey, v: string) {
    setMapping((m) => ({ ...m, [key]: v }))
  }

  // Checks the mapped data for common bad-mapping problems (e.g. reusing an
  // old CSV with fewer columns than expected, or picking the wrong column by
  // accident) before it reaches Supabase or the LLM. Returns which field is
  // at fault (so that specific select can be highlighted) plus a message, or
  // null if the data looks usable.
  function validateMappedRows(
    mapped: { score: number; main_benefit: string; improvement: string; persona: string }[],
    totalRawRows: number,
  ): { field: MappingKey; message: string } | null {
    const scoreValidRatio = mapped.length / Math.max(totalRawRows, 1)
    if (scoreValidRatio < 0.5) {
      return {
        field: "score",
        message: `Only ${mapped.length} of ${totalRawRows} rows had a valid numeric score (0-10) in the selected column. Double-check you mapped the right column for Score.`,
      }
    }

    const nonEmpty = (field: "main_benefit" | "improvement") =>
      mapped.filter((r) => r[field].trim().length > 0).length

    const mainBenefitRatio = nonEmpty("main_benefit") / mapped.length
    const improvementRatio = nonEmpty("improvement") / mapped.length

    if (mainBenefitRatio < 0.5) {
      return {
        field: "main_benefit",
        message: `Empty for most rows (${Math.round(mainBenefitRatio * 100)}% filled). If your CSV only has one combined comment column, you'll need separate Main benefit and Improvement columns.`,
      }
    }
    if (improvementRatio < 0.5) {
      return {
        field: "improvement",
        message: `Empty for most rows (${Math.round(improvementRatio * 100)}% filled). If your CSV only has one combined comment column, you'll need separate Main benefit and Improvement columns.`,
      }
    }

    // Same column accidentally mapped to both fields — not necessarily wrong,
    // but worth catching since it usually means the CSV lacks the second field.
    if (mapping.main_benefit === mapping.improvement) {
      return {
        field: "improvement",
        message: "Mapped to the same column as Main benefit. Select two different columns.",
      }
    }

    return null
  }

  async function handleAnalyze() {
    setError(null)
    setErroredField(null)
    setStatus("inserting")

    // Map raw CSV rows to score/main_benefit/improvement/persona using the chosen columns.
    // No id yet — Supabase assigns the uuid we'll use as rowRef.
    const mapped = rawRows
      .map((raw) => {
        const score = Number.parseInt(String(raw[mapping.score] ?? "").trim(), 10)
        return {
          score: Number.isNaN(score) ? -1 : score,
          main_benefit: (raw[mapping.main_benefit] ?? "").trim(),
          improvement: (raw[mapping.improvement] ?? "").trim(),
          persona: mapping.persona ? (raw[mapping.persona] ?? "").trim() : "",
        }
      })
      .filter((r) => r.score >= 0)

    if (mapped.length === 0) {
      setStatus("idle")
      setError("No rows had a valid numeric score in the selected column.")
      return
    }

    // Pre-flight validation — catch bad column mapping BEFORE the Supabase
    // insert and LLM calls, since those cost money and shouldn't run on
    // clearly broken data (e.g. reusing an old CSV that only had one combined
    // comment column, leaving "Improvement" mapped to something blank).
    const validationError = validateMappedRows(mapped, rawRows.length)
    if (validationError) {
      setStatus("idle")
      setError(validationError.message)
      setErroredField(validationError.field)
      return
    }

    // Persist to Supabase and read back the generated uuids.
    const supabase = createClient()
    const { data: inserted, error: insertError } = await supabase
      .from("responses")
      .insert(
        mapped.map((r) => ({
          score: r.score,
          main_benefit: r.main_benefit,
          improvement: r.improvement,
          persona: r.persona || null,
        })),
      )
      .select("id, score, main_benefit, improvement, persona")

    if (insertError || !inserted) {
      setStatus("idle")
      setError(`Failed to save responses: ${insertError?.message ?? "unknown error"}`)
      return
    }

    // Rows now carry their Supabase uuid as the id / rowRef.
    const rows: ResponseRow[] = inserted.map((r) => ({
      id: r.id as string,
      score: r.score as number,
      main_benefit: (r.main_benefit as string) ?? "",
      improvement: (r.improvement as string) ?? "",
      persona: (r.persona as string) ?? "",
    }))

    // Segment by score, then send structured feedback to the clustering API.
    const groups = segmentRows(rows)

    setStatus("analyzing")
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promoterMainBenefit: groups.promoter.map((r) => ({ rowRef: r.id, comment: r.main_benefit })),
          passiveImprovement: groups.passive.map((r) => ({ rowRef: r.id, comment: r.improvement })),
          detractorRows: groups.detractor.map((r) => ({ rowRef: r.id, mainBenefit: r.main_benefit, improvement: r.improvement })),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Analysis failed (${res.status})`)
      }

      const cluster = (await res.json()) as ClusterResult

      // Metrics stay score-based; themes + flags come straight from the API.
      const analysis = assembleAnalysis(rows, cluster)
      
      // Call benchmark endpoint with the computed NPS score (promoter% - detractor%)
      setStatus("benchmarking")
      const npsScore = analysis.metrics.promoter - analysis.metrics.detractor
      try {
        const benchmarkRes = await fetch("/api/benchmark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            npsScore: npsScore,
            industry: context.industry,
            businessType: context.businessType,
            model: context.model,
          }),
        })
        
        if (benchmarkRes.ok) {
          const benchmark = await benchmarkRes.json()
          analysis.benchmark = benchmark
        }
      } catch (benchmarkErr) {
        console.log("[v0] Benchmark fetch failed:", benchmarkErr)
      }
      
      analysis.context = context

      setStatus("idle")

      // If user is not authenticated, show Google auth modal with the results after sign-in
      if (!user) {
        setPendingAnalysis(analysis)
        setShowGoogleAuth(true)
        return
      }

      // Saving to Supabase is handled centrally in app/page.tsx once the
      // analysis is displayed and a user is present — no save here to avoid
      // duplicate/mismatched writes.
      onAnalyze(analysis)
    } catch (err) {
      setStatus("idle")
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.")
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {(status === "inserting" || status === "analyzing" || status === "benchmarking") && (
        <LoadingOverlay status={status} />
      )}
      <header className="mb-10">
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full border border-border bg-muted text-xs font-medium text-foreground">
            MVP · BETA
          </span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground text-balance sm:text-5xl">
          Know what actually matters to your customers.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty max-w-lg">
          Upload your feedback. Get the 2–3 things worth acting on — not the noise.
        </p>
      </header>

      {/* Trust line — sits directly above the upload control, not buried in a footer */}
      <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-muted px-4 py-3">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Your responses are only used to run this analysis. We never sell your data or use it to train models.{" "}
          <Link href="/privacy" target="_blank" className="font-medium text-foreground underline underline-offset-2">
            Privacy Policy
          </Link>
        </p>
      </div>

      {/* Source toggle */}
      <div className="mb-4 inline-flex rounded-lg border border-border bg-muted p-1">
        {(
          [
            { key: "file", label: "Upload CSV", icon: Upload },
            { key: "sheet", label: "Google Sheet link", icon: Link2 },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSource(key)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              source === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Source input */}
      {source === "file" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
            dragOver ? "border-foreground bg-muted" : "border-border bg-card hover:bg-muted/50",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {status === "parsing" ? (
            <>
              <div className="flex size-11 items-center justify-center rounded-full bg-muted">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Parsing {fileName}…</p>
            </>
          ) : fileName && hasData ? (
            <>
              <div className="flex size-11 items-center justify-center rounded-full bg-promoter-muted">
                <FileSpreadsheet className="size-5 text-promoter" />
              </div>
              <p className="text-sm font-medium text-foreground">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                {rawRows.length} rows · {columns.length} columns — click to choose a different file
              </p>
            </>
          ) : (
            <>
              <div className="flex size-11 items-center justify-center rounded-full bg-muted">
                <Upload className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Drag & drop your CSV here</p>
              <p className="text-xs text-muted-foreground">or click to browse — .csv up to 10MB</p>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sheet-url" className="text-sm font-medium text-foreground">
            Google Sheet URL
          </label>
          <input
            id="sheet-url"
            type="url"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            className={cn(
              "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
          <p className="text-xs text-muted-foreground">
            Google Sheet import is coming soon — upload a CSV export to analyze responses now.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-detractor/30 bg-detractor-muted px-3 py-2.5 text-sm text-detractor">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Column mapping */}
      {hasData && (
        <div className="mt-8 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-foreground">Map your columns</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Score, Main benefit, and Improvement are required. Persona is optional.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ColumnSelect
              id="map-score"
              label="Score"
              required
              value={mapping.score}
              onChange={(v) => setMap("score", v)}
              columns={columns}
              error={erroredField === "score"}
              errorMessage={erroredField === "score" ? error ?? undefined : undefined}
            />
            <ColumnSelect
              id="map-main-benefit"
              label="Main benefit"
              required
              value={mapping.main_benefit}
              onChange={(v) => setMap("main_benefit", v)}
              columns={columns}
              error={erroredField === "main_benefit"}
              errorMessage={erroredField === "main_benefit" ? error ?? undefined : undefined}
            />
            <ColumnSelect
              id="map-improvement"
              label="Improvement"
              required
              value={mapping.improvement}
              onChange={(v) => setMap("improvement", v)}
              columns={columns}
              error={erroredField === "improvement"}
              errorMessage={erroredField === "improvement" ? error ?? undefined : undefined}
            />
            <ColumnSelect
              id="map-persona"
              label="Persona / role"
              value={mapping.persona}
              onChange={(v) => setMap("persona", v)}
              columns={columns}
            />
          </div>
        </div>
      )}

      {/* Context fields */}
      {hasData && (
        <div className="mt-8 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-foreground">About your business</h2>
          <p className="mt-1 text-xs text-muted-foreground">Help us benchmark your NPS score against industry standards.</p>
          
          <div className="mt-4 space-y-4">
            {/* Industry */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="industry" className="text-sm font-medium text-foreground">
                Industry <span className="ml-1 text-detractor">*</span>
              </label>
              <input
                id="industry"
                type="text"
                value={context.industry}
                onChange={(e) => setContext((c) => ({ ...c, industry: e.target.value }))}
                placeholder="e.g. SaaS, Healthcare, Finance"
                className={cn(
                  "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              />
            </div>

            {/* Business Type Toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Business type</label>
              <div className="inline-flex rounded-lg border border-border bg-muted p-1 w-fit">
                {(["B2B", "B2C"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setContext((c) => ({ ...c, businessType: type }))}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      context.businessType === type
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Model</label>
              <div className="inline-flex rounded-lg border border-border bg-muted p-1 w-fit">
                {(["SaaS", "Service-based"] as const).map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => setContext((c) => ({ ...c, model }))}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      context.model === model
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>

            {/* Survey Frequency Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="frequency" className="text-sm font-medium text-foreground">
                Survey frequency
              </label>
              <select
                id="frequency"
                value={context.surveyFrequency}
                onChange={(e) => setContext((c) => ({ ...c, surveyFrequency: e.target.value as SurveyFrequency }))}
                className={cn(
                  "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {(["First time", "Monthly", "Quarterly", "Annually"] as const).map((freq) => (
                  <option key={freq} value={freq}>
                    {freq}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Analyze */}
      <div className="mt-8 flex items-center justify-between gap-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {canAnalyze ? (
            <>
              <Check className="size-3.5 text-promoter" />
              Ready to analyze
            </>
          ) : (
            "Map a score and comment column to continue"
          )}
        </p>
        <button
          disabled={!canAnalyze}
          onClick={handleAnalyze}
          className="inline-flex items-center justify-center gap-2 rounded-lg border-0 bg-black px-4 py-2 text-sm font-medium text-white transition-all hover:bg-black/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "inserting" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : status === "analyzing" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Analyzing…
            </>
          ) : status === "benchmarking" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Benchmarking…
            </>
          ) : (
            <>
              Analyze
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </div>

      {/* Google Auth Modal */}
      {showGoogleAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-lg bg-background border border-border shadow-2xl space-y-6 p-6">
            <div className="space-y-3 text-center">
              <h2 className="text-2xl font-bold text-foreground">Save your insights</h2>
              <div className="space-y-2">
                <p className="text-sm text-foreground">
                  Sign in with Google to save up to 4 NPS surveys with getChimed.
                </p>
                <p className="text-xs text-muted-foreground">
                  Without signing in, your analysis will be visible now but won&apos;t be saved for later.
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                setGoogleAuthLoading(true)
                const supabase = createClient()
                const { data, error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    skipBrowserRedirect: true, // don't navigate this window away — open a popup instead
                  },
                })

                if (error || !data?.url) {
                  console.error('Sign in error:', error)
                  setGoogleAuthLoading(false)
                  setError('Failed to sign in. Please try again.')
                  return
                }

                const popup = window.open(data.url, 'google-oauth', 'width=480,height=640')

                // The main window never navigates away, so pendingAnalysis stays
                // intact. Listen for the popup completing sign-in, then proceed.
                const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
                  if (event === 'SIGNED_IN' && session) {
                    listener.subscription.unsubscribe()
                    popup?.close()
                    setGoogleAuthLoading(false)
                    setShowGoogleAuth(false)
                    if (pendingAnalysis) {
                      onAnalyze(pendingAnalysis)
                      setPendingAnalysis(null)
                    }
                  }
                })
              }}
              disabled={googleAuthLoading}
              className="w-full rounded-lg bg-black text-white px-6 py-3 font-semibold transition-all duration-200 hover:bg-black/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              {googleAuthLoading ? (
                <>
                  <Loader2 className="inline size-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="inline size-5 mr-2 -ml-1" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>

            <button
              onClick={() => {
                setShowGoogleAuth(false)
                setGoogleAuthLoading(false)
                if (pendingAnalysis) {
                  onAnalyze(pendingAnalysis)
                  setPendingAnalysis(null)
                }
              }}
              className="w-full rounded-lg border border-border px-6 py-3 font-medium text-foreground hover:bg-muted transition-colors"
            >
              Continue without saving
            </button>

            <p className="text-xs text-center text-muted-foreground">
              Your analysis is ready to view. Sign in to save it permanently.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
