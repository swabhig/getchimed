export type Segment = "promoter" | "passive" | "detractor"
export type FlagCategory = "bug" | "friction" | "support"
export type ActionCategory = "double-down" | "fix-blocker"

export interface Theme {
  label: string
  segment: Segment
  frequency: number
  rowRefs: number[]
}

export interface Flag {
  comment: string
  category: FlagCategory
  rowRef: number
}

export interface ActionItem {
  theme: string
  category: ActionCategory
  team: string
  mentions: number
}

export interface ResponseRow {
  id: number
  score: number
  comment: string
  persona: string
}

export interface AnalysisResult {
  metrics: { promoter: number; passive: number; detractor: number }
  themes: Theme[]
  flags: Flag[]
  actionList: ActionItem[]
  responses: ResponseRow[]
}

// ── Mock responses ────────────────────────────────────────────────
export const mockResponses: ResponseRow[] = [
  { id: 12, score: 10, comment: "Incredibly fast, saves me hours every week.", persona: "Ops Lead" },
  { id: 18, score: 9, comment: "The dashboard is intuitive and fast to load.", persona: "Analyst" },
  { id: 45, score: 10, comment: "Fast setup and the support team is fantastic.", persona: "Founder" },
  { id: 78, score: 9, comment: "Blazing fast reports, exactly what we needed.", persona: "Manager" },
  { id: 21, score: 9, comment: "Support responsiveness is top notch, always quick.", persona: "Ops Lead" },
  { id: 33, score: 10, comment: "Great support and reliable performance overall.", persona: "Engineer" },
  { id: 51, score: 8, comment: "Reliable most days, occasional slow syncs.", persona: "Analyst" },
  { id: 62, score: 7, comment: "It's fine, pricing feels a bit high for the value.", persona: "Manager" },
  { id: 64, score: 8, comment: "Solid product, the pricing tiers are confusing.", persona: "Founder" },
  { id: 70, score: 7, comment: "Works well but onboarding took a while.", persona: "Engineer" },
  { id: 20, score: 3, comment: "Export crashes on large files, lost my work twice.", persona: "Analyst" },
  { id: 27, score: 2, comment: "Constant bugs when filtering, very frustrating.", persona: "Ops Lead" },
  { id: 39, score: 4, comment: "Support took days to respond to a blocking issue.", persona: "Manager" },
  { id: 44, score: 1, comment: "The mobile experience is broken and slow.", persona: "Founder" },
  { id: 55, score: 3, comment: "Too much friction to complete a simple import.", persona: "Engineer" },
]

// ── Mock analysis output ──────────────────────────────────────────
export const mockAnalysis: AnalysisResult = {
  metrics: { promoter: 47, passive: 33, detractor: 20 },
  themes: [
    { label: "fast", segment: "promoter", frequency: 31, rowRefs: [12, 45, 78, 18] },
    { label: "support", segment: "promoter", frequency: 24, rowRefs: [45, 21, 33] },
    { label: "intuitive", segment: "promoter", frequency: 18, rowRefs: [18] },
    { label: "reliable", segment: "promoter", frequency: 15, rowRefs: [33, 51] },
    { label: "dashboard", segment: "promoter", frequency: 12, rowRefs: [18] },
    { label: "reports", segment: "promoter", frequency: 9, rowRefs: [78] },
    { label: "setup", segment: "promoter", frequency: 7, rowRefs: [45] },
    { label: "saves time", segment: "promoter", frequency: 6, rowRefs: [12] },
    { label: "pricing", segment: "passive", frequency: 22, rowRefs: [62, 64] },
    { label: "onboarding", segment: "passive", frequency: 16, rowRefs: [70] },
    { label: "slow syncs", segment: "passive", frequency: 11, rowRefs: [51] },
    { label: "confusing", segment: "passive", frequency: 9, rowRefs: [64] },
    { label: "occasional", segment: "passive", frequency: 6, rowRefs: [51] },
    { label: "tiers", segment: "passive", frequency: 5, rowRefs: [64] },
  ],
  flags: [
    { comment: "Export crashes on large files, lost my work twice.", category: "bug", rowRef: 20 },
    { comment: "Constant bugs when filtering, very frustrating.", category: "bug", rowRef: 27 },
    { comment: "Support took days to respond to a blocking issue.", category: "support", rowRef: 39 },
    { comment: "The mobile experience is broken and slow.", category: "bug", rowRef: 44 },
    { comment: "Too much friction to complete a simple import.", category: "friction", rowRef: 55 },
  ],
  actionList: [
    { theme: "support responsiveness", category: "double-down", team: "Support", mentions: 31 },
    { theme: "fast performance", category: "double-down", team: "Engineering", mentions: 28 },
    { theme: "export stability", category: "fix-blocker", team: "Engineering", mentions: 14 },
    { theme: "pricing clarity", category: "fix-blocker", team: "Product", mentions: 22 },
    { theme: "onboarding flow", category: "fix-blocker", team: "Product", mentions: 16 },
  ],
  responses: mockResponses,
}
