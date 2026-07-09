"use client"

import { useRef, useState } from "react"
import Papa from "papaparse"
import { Upload, Link2, FileSpreadsheet, ArrowRight, Check, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { assembleAnalysis, segmentRows, type AnalysisResult, type ClusterResult, type ResponseRow } from "@/lib/nps-data"

interface UploadScreenProps {
  onAnalyze: (data: AnalysisResult) => void
}

type MappingKey = "score" | "comment" | "persona"

function ColumnSelect({
  id,
  label,
  required,
  value,
  onChange,
  columns,
}: {
  id: string
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  columns: string[]
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
          "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <option value="">Select a column…</option>
        {columns.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  )
}

export function UploadScreen({ onAnalyze }: UploadScreenProps) {
  const [source, setSource] = useState<"file" | "sheet">("file")
  const [fileName, setFileName] = useState<string | null>(null)
  const [sheetUrl, setSheetUrl] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [columns, setColumns] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<MappingKey, string>>({
    score: "",
    comment: "",
    persona: "",
  })
  const [status, setStatus] = useState<"idle" | "parsing" | "inserting" | "analyzing">("idle")
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasData = columns.length > 0 && rawRows.length > 0
  const canAnalyze = hasData && mapping.score !== "" && mapping.comment !== "" && status === "idle"

  function parseFile(file: File) {
    setError(null)
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
        setMapping({ score: "", comment: "", persona: "" })
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

  async function handleAnalyze() {
    setError(null)
    setStatus("inserting")

    // Map raw CSV rows to score/comment/persona using the chosen columns.
    // No id yet — Supabase assigns the uuid we'll use as rowRef.
    const mapped = rawRows
      .map((raw) => {
        const score = Number.parseInt(String(raw[mapping.score] ?? "").trim(), 10)
        return {
          score: Number.isNaN(score) ? -1 : score,
          comment: (raw[mapping.comment] ?? "").trim(),
          persona: mapping.persona ? (raw[mapping.persona] ?? "").trim() : "",
        }
      })
      .filter((r) => r.score >= 0)

    if (mapped.length === 0) {
      setStatus("idle")
      setError("No rows had a valid numeric score in the selected column.")
      return
    }

    // Persist to Supabase and read back the generated uuids.
    const supabase = createClient()
    const { data: inserted, error: insertError } = await supabase
      .from("responses")
      .insert(
        mapped.map((r) => ({
          score: r.score,
          comment: r.comment,
          persona: r.persona || null,
        })),
      )
      .select("id, score, comment, persona")

    if (insertError || !inserted) {
      setStatus("idle")
      setError(`Failed to save responses: ${insertError?.message ?? "unknown error"}`)
      return
    }

    // Rows now carry their Supabase uuid as the id / rowRef.
    const rows: ResponseRow[] = inserted.map((r) => ({
      id: r.id as string,
      score: r.score as number,
      comment: (r.comment as string) ?? "",
      persona: (r.persona as string) ?? "",
    }))

    // Segment by score, then send comments (rowRef + comment only) to the clustering API.
    const groups = segmentRows(rows)
    const toComments = (segRows: ResponseRow[]) => segRows.map((r) => ({ rowRef: r.id, comment: r.comment }))

    setStatus("analyzing")
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promoterComments: toComments(groups.promoter),
          passiveComments: toComments(groups.passive),
          detractorComments: toComments(groups.detractor),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Analysis failed (${res.status})`)
      }

      const cluster = (await res.json()) as ClusterResult

      // Metrics stay score-based; themes + flags come straight from the API.
      const analysis = assembleAnalysis(rows, cluster)
      setStatus("idle")
      onAnalyze(analysis)
    } catch (err) {
      setStatus("idle")
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.")
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
          Import your NPS responses
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          Upload a CSV export or link a Google Sheet, then map your columns so we know which fields hold the score and
          the comment.
        </p>
      </header>

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
            Score and comment are required. Persona is optional and used to segment insights.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <ColumnSelect
              id="map-score"
              label="Score"
              required
              value={mapping.score}
              onChange={(v) => setMap("score", v)}
              columns={columns}
            />
            <ColumnSelect
              id="map-comment"
              label="Comment"
              required
              value={mapping.comment}
              onChange={(v) => setMap("comment", v)}
              columns={columns}
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
        <Button size="lg" disabled={!canAnalyze} onClick={handleAnalyze}>
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
          ) : (
            <>
              Analyze
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
