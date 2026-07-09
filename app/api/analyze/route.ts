// app/api/analyze/route.ts
//
// This is the clustering API route. Paste this file in as-is — ask v0 to
// "add this exact file, don't modify the logic" since the rules inside
// (never alter customer text, keep unclustered visible, detractor flag-scan
// only) are load-bearing and shouldn't be rewritten.
//
// Requires: ANTHROPIC_API_KEY set in your Vercel project's environment variables.

import { NextRequest, NextResponse } from "next/server";

const PROMOTER_SYSTEM_PROMPT = `You are analyzing promoter feedback from an NPS survey (respondents who scored 9-10).
Your job is to cluster their open-text comments into themes based on shared meaning, not just shared words.

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
These respondents are close to becoming promoters but have blockers. Cluster their comments into themes representing what's holding them back.

Follow the same rules as promoter clustering:
1. Cluster by meaning, not keyword overlap.
2. Label themes using customers' own language.
3. Never alter or paraphrase original comment text — only assign labels and row references.
4. Unclear comments go into "unclustered" with a reason, never force-fit.
5. Return ONLY valid JSON in this exact shape:

{
  "themes": [
    { "label": "string", "rowRefs": ["string", ...] }
  ],
  "unclustered": [
    { "rowRef": "string", "reason": "string" }
  ]
}`;

const DETRACTOR_SYSTEM_PROMPT = `You are scanning detractor feedback from an NPS survey (respondents who scored 0-6).
Do NOT cluster these into themes. Only scan for red flags: bugs, breakage, critical friction, or unresolved support issues.

Flag categories:
- "bug": mentions of crashes, errors, broken features, glitches, things not working
- "friction": mentions of slowness, downtime, lost data, inability to log in or load
- "support": mentions of no response, ignored tickets, unresolved issues, long wait times

Rules:
1. Only flag comments that clearly match one of the three categories above. Do not flag general dissatisfaction that isn't one of these specific issues.
2. Never alter or paraphrase the original comment text — return the row reference and category only, plus the original comment text for the flags panel display.
3. Return ONLY valid JSON in this exact shape:

{
  "flags": [
    { "rowRef": "string", "category": "bug" | "friction" | "support", "comment": "original unaltered text" }
  ]
}`;

interface CommentInput {
  rowRef: string;
  comment: string;
}

async function callClaude(systemPrompt: string, comments: CommentInput[]) {
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
      messages: [{ role: "user", content: JSON.stringify(comments) }],
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
      promoterComments,
      passiveComments,
      detractorComments,
    }: {
      promoterComments: CommentInput[];
      passiveComments: CommentInput[];
      detractorComments: CommentInput[];
    } = body;

    const [promoterResult, passiveResult, detractorResult] = await Promise.all([
      callClaude(PROMOTER_SYSTEM_PROMPT, promoterComments),
      callClaude(PASSIVE_SYSTEM_PROMPT, passiveComments),
      callClaude(DETRACTOR_SYSTEM_PROMPT, detractorComments),
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