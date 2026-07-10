// app/api/benchmark/route.ts
//
// Looks up a context-specific NPS benchmark using the AI SDK via the Vercel AI
// Gateway (zero-config for Anthropic — no ANTHROPIC_API_KEY needed).
// Fails gracefully — the badge just won't show rather than breaking the page.

import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"

const MODEL = "anthropic/claude-sonnet-5"

const BENCHMARK_SYSTEM_PROMPT = `You are given an NPS score along with context about a company: its industry, whether it is B2B or B2C, and whether it is SaaS or service-based.

Your job: report the most relevant, well-established NPS benchmark for that specific segment based on widely cited industry benchmark reports (such as CustomerGauge, Retently, or Bain & Company).

Rules you must follow exactly:
1. Match the benchmark to the given industry and business type as closely as possible. If an exact industry match isn't available, use the closest reasonable category (e.g. "B2B SaaS" generally) and say so in your remark.
2. Never invent a specific benchmark number you are not reasonably confident about. If you are unsure, give a conservative widely-accepted range and note the uncertainty in the remark.
3. Write a short remark, 1-2 sentences, stating where the given NPS score falls relative to the benchmark.
4. Classify the result into one of these sentiment buckets based on where the score falls relative to the benchmark: "needs-attention" (below 0, or well below benchmark), "below-benchmark", "at-benchmark", "above-benchmark", "excellent" (far above benchmark, e.g. Bain & Company's "world class" tier).
5. Provide the name of the benchmark source you referenced and, if you know it, its URL.`

const benchmarkSchema = z.object({
  remark: z.string(),
  source: z.string(),
  sourceUrl: z.string(),
  sentiment: z.enum(["needs-attention", "below-benchmark", "at-benchmark", "above-benchmark", "excellent"]),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { npsScore, industry, businessType, model } = body as {
      npsScore: number
      industry: string
      businessType: "B2B" | "B2C"
      model: "SaaS" | "Service-based"
    }

    const userMessage = `NPS score: ${npsScore}
Industry: ${industry}
Business type: ${businessType}
Model: ${model}

Report the most relevant benchmark and classify this score against it.`

    const { object } = await generateObject({
      model: MODEL,
      schema: benchmarkSchema,
      system: BENCHMARK_SYSTEM_PROMPT,
      prompt: userMessage,
    })

    return NextResponse.json(object)
  } catch (err: any) {
    console.error("[v0] Benchmark route error:", err)
    return NextResponse.json({ error: err.message || "Benchmark lookup failed" }, { status: 500 })
  }
}
