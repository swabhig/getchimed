// app/api/drive/import/route.ts
//
// Takes a Google Sheet file ID (from the Picker) and returns its data in
// the SAME { columns, rows } shape the CSV parser already produces.
//
// Deliberately uses the DRIVE API's files.export endpoint (converts the
// picked sheet to CSV) rather than the Sheets API's values.get — this is
// what keeps the whole Drive/Sheets integration on the non-sensitive
// drive.file scope only. See lib/google-drive-client.ts for the full
// reasoning (no user cap, no "unverified app" warning, no Google review
// needed).

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidAccessToken } from "@/lib/google-drive"

function parseCsv(text: string): { columns: string[]; rows: Record<string, string>[] } {
  // Simple CSV parser — handles quoted fields with embedded commas, same
  // cases papaparse handles on the client for local CSV uploads.
  const lines: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ",") {
        row.push(field)
        field = ""
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && next === "\n") i++
        row.push(field)
        field = ""
        lines.push(row)
        row = []
      } else {
        field += char
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    lines.push(row)
  }

  const nonEmptyLines = lines.filter((r) => r.some((cell) => cell.trim().length > 0))
  if (nonEmptyLines.length < 2) return { columns: [], rows: [] }

  const [headerRow, ...dataRows] = nonEmptyLines
  const columns = headerRow.map((h) => h.trim())
  const rows = dataRows.map((r) => {
    const obj: Record<string, string> = {}
    columns.forEach((col, i) => {
      obj[col] = r[i] ?? ""
    })
    return obj
  })

  return { columns, rows }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const { fileId } = await req.json()
  if (!fileId) {
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 })
  }

  const accessToken = await getValidAccessToken(user.id)
  if (!accessToken) {
    return NextResponse.json(
      { error: "Google Drive isn't connected (or the connection expired). Please reconnect." },
      { status: 401 },
    )
  }

  // Drive API's export endpoint — converts the picked Google Sheet's first
  // tab to CSV. Covered by drive.file since the Picker already granted
  // per-file access to this specific file.
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!res.ok) {
    const body = await res.text()
    console.error("[drive/import] Drive export error:", body)
    return NextResponse.json(
      { error: "Couldn't read that sheet. Check it's shared with your account and try again." },
      { status: 502 },
    )
  }

  const csvText = await res.text()
  const { columns, rows } = parseCsv(csvText)

  if (rows.length === 0) {
    return NextResponse.json({ error: "That sheet doesn't have enough rows to analyze." }, { status: 400 })
  }

  return NextResponse.json({ columns, rows })
}
