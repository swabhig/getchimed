// app/api/benchmark/route.ts
//
// Looks up a context-specific NPS benchmark using Claude with web search enabled.
// Paste this in as-is — ask v0 "add this exact file, don't modify the logic."
//
// Requires: ANTHROPIC_API_KEY set in your Vercel project's environment variables.

import { NextRequest, NextResponse } from "next/server";

const BENCHMARK_SYSTEM_PROMPT = `You are given an NPS score along with context about a company: its industry, whether it is B2B or B2C, and whether it is SaaS or service-based.

Your job: search the web for the most relevant, current NPS benchmark for that specific segment. Prioritize primary benchmark sources like customergauge.com, retently.com, or similarly cited industry benchmark reports over generic blog aggregators.

Rules you must follow exactly:
1. Search for a benchmark that matches the given industry and business type as closely as possible. If an exact industry match isn't available, use the closest reasonable category (e.g. "B2B SaaS" generally) and say so in your remark.
2. Never invent a benchmark number. If you cannot find a credible current benchmark, say so honestly in the remark instead of guessing.
3. Write a short remark, 1-2 sentences, stating where the given NPS score falls relative to the benchmark you found.
4. Classify the result into one of these sentiment buckets based on where the score falls relative to the benchmark: "needs-attention" (below 0, or well below benchmark), "below-benchmark", "at-benchmark", "above-benchmark", "excellent" (far above benchmark, e.g. Bain & Company's "world class" tier).
5. Include the actual URL of the benchmark page you used as the source, so users can verify it themselves.
6. Return ONLY valid JSON, no preamble, no markdown formatting, matching this exact shape:

{
  "remark": "string",
  "source": "string, name of the benchmark source used",
  "sourceUrl": "string, the actual URL of the benchmark page",
  "sentiment": "needs-attention" | "below-benchmark" | "at-benchmark" | "above-benchmark" | "excellent"
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { npsScore, industry, businessType, model } = body as {
      npsScore: number;
      industry: string;
      businessType: "B2B" | "B2C";
      model: "SaaS" | "Service-based";
    };

    const userMessage = `NPS score: ${npsScore}
Industry: ${industry}
Business type: ${businessType}
Model: ${model}

Find the most relevant current benchmark and classify this score against it.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: BENCHMARK_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${errText}`);
    }

    const data = await response.json();

    // With web search enabled, the response may include tool_use / tool_result
    // blocks before the final text block. Grab the last text block, which is
    // the model's final answer after any searches it ran.
    const textBlocks = data.content.filter((block: any) => block.type === "text");
    const finalText = textBlocks[textBlocks.length - 1];

    if (!finalText) {
      throw new Error("No text response from LLM after web search");
    }

    const cleaned = finalText.text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Benchmark route error:", err);
    // Fail gracefully — the badge just won't show rather than breaking the page.
    return NextResponse.json(
      { error: err.message || "Benchmark lookup failed" },
      { status: 500 }
    );
  }
}
