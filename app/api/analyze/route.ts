// app/api/analyze/route.ts
//
// Updated version: main_benefit and improvement are separate fields, never merged.
// - Promoter clustering reads main_benefit only (what to double down on)
// - Passive clustering reads improvement only (what's blocking conversion)
// - Detractor flag-scan reads both fields, tagging which field each flag came from
//
// Paste this file in as-is — ask v0 to "add this exact file, don't modify the logic."
// Requires: ANTHROPIC_API_KEY set in your Vercel project's environment variables.

import { NextRequest, NextResponse } from "next/server";

const PROMOTER_SYSTEM_PROMPT = `You are analyzing promoter feedback from an NPS survey (respondents who scored 9-10).
You are given each respondent's answer to "What is the main benefit you receive from this product?"
Cluster these answers into themes based on shared meaning, not just shared words — this represents what the company should double down on.

Rules you must follow exactly:
1. Cluster comments into themes based on meaning, not literal keyword overlap.
2. Label each theme using the customers' own language where possible — not generic product jargon.
3. Never alter, summarize, paraphrase, or quote back the original comment text in your output. Only assign a theme label and the row reference.
4. If a comment doesn't clearly fit any theme, place its row reference in "unclustered" with a short reason. Do not force-fit it.
5. Return ONLY valid JSON, no preamble, no markdown formatting, matching this exact shape:

{
  "themes": [
    { "label": "string", "rowRefs": ["string", ...] }
  ],
  "unclustered": [
    { "rowRef": "string", "reason": "string" }
  ]
}`;

const PASSIVE_SYSTEM_PROMPT = `You are analyzing passive feedback from an NPS survey (respondents who scored 7-8).
You are given each respondent's answer to "What's one thing we could improve?"
Cluster these answers into themes based on shared meaning — this represents what's blocking these respondents from becoming promoters.

Rules you must follow exactly:
1. Cluster comments into themes based on meaning, not literal keyword overlap.
2. Label each theme using the customers' own language where possible.
3. Never alter, summarize, paraphrase, or quote back the original comment text — only assign a theme label and row reference.
4. If a comment doesn't clearly fit any theme, place its row reference in "unclustered" with a short reason. Do not force-fit it.
5. Return ONLY valid JSON, no preamble, no markdown formatting, matching this exact shape:

{
  "themes": [
    { "label": "string", "rowRefs": ["string", ...] }
  ],
  "unclustered": [
    { "rowRef": "string", "reason": "string" }
  ]
}`;

const DETRACTOR_SYSTEM_PROMPT = `You are scanning detractor feedback from an NPS survey (respondents who scored 0-6).
Each respondent has two fields: their answer to "main benefit" and their answer to "improvement". Scan BOTH fields for red flags — do NOT cluster into themes.

Flag categories:
- "bug": mentions of crashes, errors, broken features, glitches, things not working
- "friction": mentions of slowness, downtime, lost data, inability to log in or load
- "support": mentions of no response, ignored tickets, unresolved issues, long wait times

Rules:
1. Only flag comments that clearly match one of the three categories above. Do not flag general dissatisfaction that isn't one of these specific issues.
2. Never alter or paraphrase the original comment text — return the row reference, category, which field it came from ("main_benefit" or "improvement"), and the original unaltered text.
3. A single respondent may produce zero, one, or two flags (one per field) if both fields raise issues.
4. Return ONLY valid JSON in this exact shape:

{
  "flags": [
    { "rowRef": "string", "field": "main_benefit" | "improvement", "category": "bug" | "friction" | "support", "comment": "original unaltered text" }
  ]
}`;

interface SegmentCommentInput {
  rowRef: string;
  comment: string;
}

interface DetractorCommentInput {
  rowRef: string;
  mainBenefit: string;
  improvement: string;
}

async function callClaude(systemPrompt: string, payload: unknown) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content.find((block: any) => block.type === "text");

  if (!textBlock) {
    throw new Error("No text response from LLM");
  }

  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      promoterMainBenefit,
      passiveImprovement,
      detractorRows,
    }: {
      promoterMainBenefit: SegmentCommentInput[]; // { rowRef, comment: main_benefit text }
      passiveImprovement: SegmentCommentInput[]; // { rowRef, comment: improvement text }
      detractorRows: DetractorCommentInput[]; // { rowRef, mainBenefit, improvement }
    } = body;

    const [promoterResult, passiveResult, detractorResult] = await Promise.all([
      callClaude(PROMOTER_SYSTEM_PROMPT, promoterMainBenefit),
      callClaude(PASSIVE_SYSTEM_PROMPT, passiveImprovement),
      callClaude(DETRACTOR_SYSTEM_PROMPT, detractorRows),
    ]);

    const attachMetadata = (result: any, segment: "promoter" | "passive") =>
      result.themes.map((theme: any) => ({
        ...theme,
        segment,
        frequency: theme.rowRefs.length,
      }));

    const output = {
      themes: [
        ...attachMetadata(promoterResult, "promoter"),
        ...attachMetadata(passiveResult, "passive"),
      ],
      unclustered: [
        ...promoterResult.unclustered,
        ...passiveResult.unclustered,
      ],
      flags: detractorResult.flags,
    };

    return NextResponse.json(output);
  } catch (err: any) {
    console.error("Analyze route error:", err);
    return NextResponse.json(
      { error: err.message || "Analysis failed" },
      { status: 500 }
    );
  }
}