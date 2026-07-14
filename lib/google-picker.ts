// lib/google-picker.ts
//
// Loads Google's Picker JS API (separate from supabase-js — this is
// Google's own gapi library) and opens the file picker, scoped to Google
// Sheets files only. Returns the picked file's ID, or null if cancelled.

declare global {
  interface Window {
    gapi: any
    google: any
  }
}

let gapiLoadPromise: Promise<void> | null = null

function loadGapiScript(): Promise<void> {
  if (gapiLoadPromise) return gapiLoadPromise
  gapiLoadPromise = new Promise((resolve, reject) => {
    if (window.gapi) {
      resolve()
      return
    }
    const script = document.createElement("script")
    script.src = "https://apis.google.com/js/api.js"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Google API script"))
    document.head.appendChild(script)
  })
  return gapiLoadPromise
}

export async function openGoogleSheetPicker(accessToken: string): Promise<string | null> {
  await loadGapiScript()

  await new Promise<void>((resolve) => {
    window.gapi.load("picker", { callback: resolve })
  })

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID // GCP project NUMBER (not project ID) — see setup notes

  return new Promise((resolve) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.SPREADSHEETS)

    const builder = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          resolve(data.docs[0].id as string)
        } else if (data.action === window.google.picker.Action.CANCEL) {
          resolve(null)
        }
      })

    // Required for drive.file scope — without this, a file can be visually
    // picked but the app never actually receives a real per-file access
    // grant for it, so any later read/export call on that file fails.
    if (appId) builder.setAppId(appId)

    const picker = builder.build()
    picker.setVisible(true)
  })
}
