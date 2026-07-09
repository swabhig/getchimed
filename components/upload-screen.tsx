"use client"

import { useRef, useState } from "react"
import { Upload, Link2, FileSpreadsheet, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface UploadScreenProps {
  onAnalyze: () => void
}

const MOCK_COLUMNS = ["Timestamp", "NPS Score", "What could we improve?", "Role", "Email"]

type MappingKey = "score" | "comment" | "persona"

function ColumnSelect({
  id,
  label,
  required,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  disabled?: boolean
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
        disabled={disabled}
        className={cn(
          "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <option value="">Select a column…</option>
        {MOCK_COLUMNS.map((c) => (
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
  const [mapping, setMapping] = useState<Record<MappingKey, string>>({
    score: "",
    comment: "",
    persona: "",
  })
  const inputRef = useRef<HTMLInputElement>(null)

  const hasData = source === "file" ? !!fileName : sheetUrl.trim().length > 0
  const canAnalyze = hasData && mapping.score !== "" && mapping.comment !== ""

  function handleFiles(files: FileList | null) {
    if (files && files[0]) setFileName(files[0].name)
  }

  function setMap(key: MappingKey, v: string) {
    setMapping((m) => ({ ...m, [key]: v }))
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
          {fileName ? (
            <>
              <div className="flex size-11 items-center justify-center rounded-full bg-promoter-muted">
                <FileSpreadsheet className="size-5 text-promoter" />
              </div>
              <p className="text-sm font-medium text-foreground">{fileName}</p>
              <p className="text-xs text-muted-foreground">Click to choose a different file</p>
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
          <p className="text-xs text-muted-foreground">Make sure the sheet is shared as “anyone with the link”.</p>
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
            />
            <ColumnSelect
              id="map-comment"
              label="Comment"
              required
              value={mapping.comment}
              onChange={(v) => setMap("comment", v)}
            />
            <ColumnSelect
              id="map-persona"
              label="Persona / role"
              value={mapping.persona}
              onChange={(v) => setMap("persona", v)}
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
        <Button size="lg" disabled={!canAnalyze} onClick={onAnalyze}>
          Analyze
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
