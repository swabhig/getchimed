// app/api/analyze/route.ts
//
// Uses the Vercel AI Gateway (zero-config for Anthropic) via the AI SDK.
// No ANTHROPIC_API_KEY needed — the gateway handles auth.
//
// - Promoter clustering reads main_benefit only (what to double down on)
// - Passive clustering reads improvement only (what's blocking conversion)
// - Detractor flag-scan reads both fields, tagging which field each flag came from

import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"

const MODEL = "anthropic/claude-sonnet-5"

const PROMOTER_SYSTEM_PROMPT = `You are analyzing promoter feedback from an NPS survey (respondents who scored 9-10).
You are given each respondent's answer to "What is the main benefit you receive from this product?"
Cluster these answers into themes based on shared meaning, not just shared words — this represents what the company should double down on.

Rules you must follow exactly:
1. Cluster comments into themes based on meaning, not literal keyword overlap.
2. Label each theme using the customers' own language where possible — not generic product jargon.
3. Theme labels must be short — 1 to 4 words maximum. Never use full sentences or verbatim comment text as labels.
4. Never alter, summarize, paraphrase, or quote back the original comment text in your output. Only assign a theme label and the row reference.
5. If a comment doesn't clearly fit any theme, place its row reference in "unclustered" with a short reason. Do not force-fit it.`

const PASSIVE_SYSTEM_PROMPT = `You are analyzing passive feedback from an NPS survey (respondents who scored 7-8).
You are given each respondent's answer to "What's one thing we could improve?"
Cluster these answers into themes based on shared meaning — this represents what's blocking these respondents from becoming promoters.

Rules you must follow exactly:
1. Cluster comments into themes based on meaning, not literal keyword overlap.
2. Label each theme using the customers' own language where possible.
3. Theme labels must be short — 1 to 4 words maximum. Never use full sentences or verbatim comment text as labels.
4. Never alter, summarize, paraphrase, or quote back the original comment text — only assign a theme label and row reference.
5. If a comment doesn't clearly fit any theme, place its row reference in "unclustered" with a short reason. Do not force-fit it.`

const DETRACTOR_SYSTEM_PROMPT = `You are scanning detractor feedback from an NPS survey (respondents who scored 0-6).
Each respondent has two fields: their answer to "main benefit" and their answer to "improvement". Scan BOTH fields for red flags — do NOT cluster into themes.

Flag categories:
- "bug": mentions of crashes, errors, broken features, glitches, things not working
- "friction": mentions of slowness, downtime, lost data, inability to log in or load
- "support": mentions of no response, ignored tickets, unresolved issues, long wait times

Rules:
1. Only flag comments that clearly match one of the three categories above. Do not flag general dissatisfaction that isn't one of these specific issues.
2. Never alter or paraphrase the original comment text — return the row reference, category, which field it came from ("main_benefit" or "improvement"), and the original unaltered text.
3. A single respondent may produce zero, one, or two flags (one per field) if both fields raise issues.`

const clusterSchema = z.object({
  themes: z.array(
    z.object({
      label: z.string(),
      rowRefs: z.array(z.string()),
    }),
  ),
  unclustered: z.array(
    z.object({
      rowRef: z.string(),
      reason: z.string(),
    }),
  ),
})

const detractorSchema = z.object({
  flags: z.array(
    z.object({
      rowRef: z.string(),
      field: z.enum(["main_benefit", "improvement"]),
      category: z.enum(["bug", "friction", "support"]),
      comment: z.string(),
    }),
  ),
})

interface SegmentCommentInput {
  rowRef: string
  comment: string
}

interface DetractorCommentInput {
  rowRef: string
  mainBenefit: string
  improvement: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      promoterMainBenefit,
      passiveImprovement,
      detractorRows,
    }: {
      promoterMainBenefit: SegmentCommentInput[]
      passiveImprovement: SegmentCommentInput[]
      detractorRows: DetractorCommentInput[]
    } = body

    // Visibility for debugging — if a segment comes back with zero themes,
    // check these counts first to rule out empty/near-empty input before
    // suspecting the LLM call itself.
    console.log("[chime] analyze input sizes:", {
      promoterMainBenefit: promoterMainBenefit.length,
      passiveImprovement: passiveImprovement.length,
      detractorRows: detractorRows.length,
      promoterNonEmpty: promoterMainBenefit.filter((r) => r.comment.trim().length > 0).length,
      passiveNonEmpty: passiveImprovement.filter((r) => r.comment.trim().length > 0).length,
    })

    const [promoterResult, passiveResult, detractorResult] = await Promise.all([
      generateObject({
        model: MODEL,
        schema: clusterSchema,
        system: PROMOTER_SYSTEM_PROMPT,
        prompt: JSON.stringify(promoterMainBenefit),
      }),
      generateObject({
        model: MODEL,
        schema: clusterSchema,
        system: PASSIVE_SYSTEM_PROMPT,
        prompt: JSON.stringify(passiveImprovement),
      }),
      generateObject({
        model: MODEL,
        schema: detractorSchema,
        system: DETRACTOR_SYSTEM_PROMPT,
        prompt: JSON.stringify(detractorRows),
      }),
    ])

    console.log("[chime] analyze output sizes:", {
      promoterThemes: promoterResult.object.themes.length,
      passiveThemes: passiveResult.object.themes.length,
      detractorFlags: detractorResult.object.flags.length,
    })

    const attachMetadata = (result: z.infer<typeof clusterSchema>, segment: "promoter" | "passive") =>
      result.themes.map((theme) => ({
        ...theme,
        segment,
        frequency: theme.rowRefs.length,
      }))

    const output = {
      themes: [
        ...attachMetadata(promoterResult.object, "promoter"),
        ...attachMetadata(passiveResult.object, "passive"),
      ],
      unclustered: [...promoterResult.object.unclustered, ...passiveResult.object.unclustered],
      flags: detractorResult.object.flags,
    }

    return NextResponse.json(output)
  } catch (err: any) {
    console.error("[v0] Analyze route error:", err)
    return NextResponse.json({ error: err.message || "Analysis failed" }, { status: 500 })
  }
}
