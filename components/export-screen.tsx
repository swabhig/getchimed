"use client"

import { Download, Sheet, ArrowLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AnalysisResult } from "@/lib/nps-data"

interface ExportScreenProps {
  data: AnalysisResult
  onBack: () => void
}

function toCsv(data: AnalysisResult): string {
  const rows: string[][] = [["theme", "category", "team", "mentions"]]
  for (const a of data.actionList) {
    rows.push([a.theme, a.category, a.team, String(a.mentions)])
  }
  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")
}

export function ExportScreen({ data, onBack }: ExportScreenProps) {
  function downloadCsv() {
    const blob = new Blob([toCsv(data)], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "nps-action-list.csv"
    link.click()
    URL.revokeObjectURL(url)
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
          Download the action list as a CSV, or push it straight into a Google Sheet for your team.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col rounded-lg border border-border bg-card p-5">
          <div className="flex size-11 items-center justify-center rounded-full bg-muted">
            <Download className="size-5 text-foreground" />
          </div>
          <h2 className="mt-4 text-sm font-medium text-foreground">Download CSV</h2>
          <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
            A spreadsheet-ready file with every prioritized theme, category, team, and mention count.
          </p>
          <Button className="mt-4 w-full" onClick={downloadCsv}>
            <Download className="size-4" />
            Download CSV
          </Button>
        </div>

        <div className="flex flex-col rounded-lg border border-border bg-card p-5">
          <div className="flex size-11 items-center justify-center rounded-full bg-promoter-muted">
            <Sheet className="size-5 text-promoter" />
          </div>
          <h2 className="mt-4 text-sm font-medium text-foreground">Export to Google Sheets</h2>
          <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
            Sync the action list to a new sheet in your Drive. Connect your account to enable this.
          </p>
          <Button variant="outline" className="mt-4 w-full" disabled>
            <Sheet className="size-4" />
            Connect to enable
          </Button>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
        <Check className="size-4 shrink-0 text-promoter" />
        Your action list has {data.actionList.length} items ready to export.
      </div>
    </div>
  )
}
