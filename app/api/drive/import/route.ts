// app/api/drive/import/route.ts
//
// Takes a Google Sheet file ID (from the Picker) and returns its data in
// the SAME { columns, rows } shape the CSV parser already produces — so
// the existing column-mapping, validation, and analyze pipeline all work
// completely unchanged, regardless of whether the data came from a local
// CSV or a picked Google Sheet.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidAccessToken } from "@/lib/google-drive"

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

  // Read the first sheet's used range. A1:ZZ is generous enough for
  // realistic NPS exports without needing to look up the sheet's exact
  // dimensions first.
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/A1:ZZ10000`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!res.ok) {
    const body = await res.text()
    console.error("[drive/import] Sheets API error:", body)
    return NextResponse.json({ error: "Couldn't read that sheet. Check it's shared with your account." }, { status: 502 })
  }

  const data = await res.json()
  const values: string[][] = data.values ?? []

  if (values.length < 2) {
    return NextResponse.json({ error: "That sheet doesn't have enough rows to analyze." }, { status: 400 })
  }

  const [headerRow, ...dataRows] = values
  const columns = headerRow.map((h) => String(h ?? "").trim())

  // Same shape as papaparse's output: array of objects keyed by column name.
  const rows = dataRows
    .filter((r) => r.some((cell) => String(cell ?? "").trim().length > 0)) // skip fully blank rows
    .map((r) => {
      const obj: Record<string, string> = {}
      columns.forEach((col, i) => {
        obj[col] = String(r[i] ?? "")
      })
      return obj
    })

  return NextResponse.json({ columns, rows })
}
