"use client"

import { useState } from "react"
import { Download, Sheet, ArrowLeft, Check, Copy, MessageSquare, Loader2, ExternalLink, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { connectGoogleDrive } from "@/lib/google-drive-client"
import type { AnalysisResult } from "@/lib/nps-data"

interface ExportScreenProps {
  data: AnalysisResult
  onBack: () => void
  user?: any
}

function toCsv(data: AnalysisResult): string {
  const rows: string[][] = [["theme", "category", "team", "mentions"]]
  for (const a of data.actionList) {
    rows.push([a.theme, a.category, a.team, String(a.mentions)])
  }
  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")
}

function generateHuddleSummary(data: AnalysisResult): string {
  const npsScore = data.metrics.promoter - data.metrics.detractor
  const responseCount = data.responses.length
  
  const promoterThemes = data.themes
    .filter((t) => t.segment === "promoter")
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 2)
  
  const passiveThemes = data.themes
    .filter((t) => t.segment === "passive")
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 2)
  
  const detractorFlagCount = data.flags.length
  
  const summary = `## NPS Huddle Summary

**NPS Score:** ${npsScore}
**Responses:** ${responseCount}

### Top Promoter Themes
${promoterThemes.map((t) => `- ${t.label}`).join("\n")}

### Top Improvement Areas
${passiveThemes.map((t) => `- ${t.label}`).join("\n")}

### Critical Issues
**Detractor Flags:** ${detractorFlagCount}`
  
  return summary
}

export function ExportScreen({ data, onBack, user }: ExportScreenProps) {
  const [copiedSummary, setCopiedSummary] = useState(false)
  const [sheetsExporting, setSheetsExporting] = useState(false)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [sheetsUrl, setSheetsUrl] = useState<string | null>(null)
  const [sheetsError, setSheetsError] = useState<string | null>(null)

  function downloadCsv() {
    const blob = new Blob([toCsv(data)], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "nps-action-list.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleExportToSheets() {
    if (!user) {
      setSheetsError("Sign in first to export to Google Sheets.")
      return
    }

    setSheetsError(null)
    setSheetsExporting(true)

    try {
      let statusRes = await fetch("/api/drive/token-status")
      let status = await statusRes.json()

      if (!status.accessToken) {
        const connected = await connectGoogleDrive()
        if (!connected) {
          setSheetsExporting(false)
          return
        }
      }

      const res = await fetch("/api/drive/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: data }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? "Export failed")
      }

      const { url } = await res.json()
      setSheetsUrl(url)
    } catch (err) {
      setSheetsError(err instanceof Error ? err.message : "Export failed. Please try again.")
    } finally {
      setSheetsExporting(false)
    }
  }

  async function handlePdfExport() {
    setPdfExporting(true)
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: data }),
      })

      if (!res.ok) {
        throw new Error("Failed to generate PDF")
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "chime-export.pdf"
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("PDF export failed:", err)
    } finally {
      setPdfExporting(false)
    }
  }
  
  async function copySummaryToClipboard() {
    const summary = generateHuddleSummary(data)
    await navigator.clipboard.writeText(summary)
    setCopiedSummary(true)
    setTimeout(() => setCopiedSummary(false), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to results
      </button>

      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Export your insights</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          Download a polished PDF to share, push the full data into a Google Sheet, or grab a quick summary for Slack.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col rounded-2xl border-2 border-brand-accent/40 bg-card p-5">
          <div className="flex size-11 items-center justify-center rounded-full bg-brand-accent/15">
            <FileText className="size-5 text-brand-accent" />
          </div>
          <h2 className="mt-4 text-sm font-medium text-foreground">Download PDF</h2>
          <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
            A one-page, share-ready summary — NPS score, top themes, and fixes by team. The one to screenshot or forward.
          </p>
          <Button className="mt-4 w-full" onClick={handlePdfExport} disabled={pdfExporting}>
            {pdfExporting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FileText className="size-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
          <div className="flex size-11 items-center justify-center rounded-full bg-promoter-muted">
            <Sheet className="size-5 text-promoter" />
          </div>
          <h2 className="mt-4 text-sm font-medium text-foreground">Export to Google Sheets</h2>
          <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
            The full data — takeaway, themes, flags, and action list — in one sheet in your Drive, for anyone who wants to dig in.
          </p>
          {sheetsUrl ? (
            <a
              href={sheetsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
            >
              <ExternalLink className="size-4" />
              Open in Google Sheets
            </a>
          ) : (
            <Button variant="outline" className="mt-4 w-full" onClick={handleExportToSheets} disabled={sheetsExporting}>
              {sheetsExporting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Exporting…
                </>
              ) : (
                <>
                  <Sheet className="size-4" />
                  Export to Google Sheets
                </>
              )}
            </Button>
          )}
          {sheetsError && <p className="mt-2 text-xs text-detractor">{sheetsError}</p>}
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
          <div className="flex size-11 items-center justify-center rounded-full bg-muted">
            <Download className="size-5 text-foreground" />
          </div>
          <h2 className="mt-4 text-sm font-medium text-foreground">Download CSV</h2>
          <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
            A spreadsheet-ready file with every prioritized theme, category, team, and mention count.
          </p>
          <Button variant="outline" className="mt-4 w-full" onClick={downloadCsv}>
            <Download className="size-4" />
            Download CSV
          </Button>
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
          <div className="flex size-11 items-center justify-center rounded-full bg-passive-muted">
            <MessageSquare className="size-5 text-passive" />
          </div>
          <h2 className="mt-4 text-sm font-medium text-foreground">Huddle Summary</h2>
          <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
            A quick markdown summary with NPS score, top themes, and critical issues for Slack or docs.
          </p>
          <Button variant="outline" className="mt-4 w-full" onClick={copySummaryToClipboard}>
            <Copy className="size-4" />
            {copiedSummary ? "Copied!" : "Copy to clipboard"}
          </Button>
        </div>
      </div>

      <details className="mt-6 group">
        <summary className="flex cursor-pointer select-none items-center gap-2 rounded-2xl border border-border bg-card p-4 hover:bg-muted/50">
          <span className="flex-1 text-sm font-medium text-foreground">Preview Huddle Summary</span>
          <span className="text-muted-foreground transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="mt-3 rounded-2xl border border-border bg-muted/30 p-4">
          <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground font-mono">
            {generateHuddleSummary(data)}
          </pre>
        </div>
      </details>

      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
        <Check className="size-4 shrink-0 text-promoter" />
        Your analysis has {data.responses.length} responses and {data.actionList.length} prioritized actions ready to export.
      </div>
    </div>
  )
}
