"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

// "Rate Chime" — the meta-NPS easter egg, per the Claude Design handoff.
// Same state machine, same /api/feedback calls, same 3-tier score
// thresholds as the original — this is the visual/interaction layer:
// a vertical edge tab trigger + a centered modal instead of a footer
// popover.

type Stage = "closed" | "score" | "reaction" | "done"

const TIER_CLASSES = {
  good: "bg-promoter-muted text-promoter hover:bg-promoter hover:text-promoter-foreground",
  neutral: "bg-passive-muted text-passive hover:bg-passive hover:text-passive-foreground",
  bad: "bg-detractor-muted text-detractor hover:bg-detractor hover:text-detractor-foreground",
} as const

function tierFor(n: number): keyof typeof TIER_CLASSES {
  if (n >= 9) return "good"
  if (n >= 7) return "neutral"
  return "bad"
}

function reactionFor(score: number): { headline: string; tone: keyof typeof TIER_CLASSES } {
  if (score >= 9) return { headline: "Nice, we'll take it 🔔", tone: "good" }
  if (score >= 7) return { headline: "Good to know — anything specific we could improve?", tone: "neutral" }
  return { headline: "Brutal. Tell us why.", tone: "bad" }
}

const toneTextClass = {
  good: "text-promoter",
  neutral: "text-passive",
  bad: "text-detractor",
} as const

export function RatePageWidget() {
  const [stage, setStage] = useState<Stage>("closed")
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setStage("closed")
    setScore(null)
    setComment("")
  }

  // Escape closes the modal, matching standard modal expectations.
  useEffect(() => {
    if (stage === "closed") return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") reset()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [stage])

  async function submitScore(s: number) {
    setScore(s)
    setStage("reaction")
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: s }),
      })
    } catch {
      // non-critical — this is a footer easter egg, not core functionality
    }
    if (s >= 9) setTimeout(reset, 2200)
  }

  async function submitComment() {
    if (!comment.trim() || score === null) {
      reset()
      return
    }
    setSubmitting(true)
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment: comment.trim() }),
      })
    } catch {
      // non-critical
    } finally {
      setSubmitting(false)
      setStage("done")
      setTimeout(reset, 1600)
    }
  }

  const reaction = score !== null ? reactionFor(score) : null

  return (
    <>
      <style>{`
        @keyframes chime-pop-in {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chime-scrim-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Vertical edge tab trigger */}
      <button
        type="button"
        onClick={() => setStage("score")}
        className="fixed right-0 top-1/2 z-30 -translate-y-1/2 rounded-l-lg bg-foreground px-2 py-3 text-[11px] font-semibold text-background shadow-lg"
        style={{ writingMode: "vertical-rl" }}
      >
        Rate Chime
      </button>

      {stage !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: "rgba(17,18,19,0.5)",
            backdropFilter: "blur(2px)",
            animation: "chime-scrim-in 0.2s ease",
          }}
          onClick={reset}
        >
          <div
            className="w-full max-w-[360px] rounded-[18px] bg-card p-7 shadow-2xl"
            style={{ animation: "chime-pop-in 0.25s cubic-bezier(.4,.2,.2,1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between">
              {stage === "score" && (
                <p className="text-xs font-bold uppercase tracking-wide text-brand-accent">The meta one</p>
              )}
              <button
                type="button"
                onClick={reset}
                aria-label="Close"
                className="ml-auto -mr-1 -mt-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {stage === "score" && (
              <>
                <p className="mt-2 text-[19px] font-semibold leading-snug text-foreground">
                  Go on, rate the vibe. We dare you.
                </p>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  An NPS tool asking for its own NPS score. We see the irony too.
                </p>
                <div className="mt-5 grid grid-cols-11 gap-[5px]">
                  {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => submitScore(n)}
                      className={cn(
                        "h-6 rounded-md text-[10px] font-semibold transition-colors",
                        TIER_CLASSES[tierFor(n)],
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                  <span>Not likely</span>
                  <span>Very likely</span>
                </div>
              </>
            )}

            {stage === "reaction" && reaction && (
              <div className="mt-2">
                <p className={cn("text-[17px] font-semibold leading-snug", toneTextClass[reaction.tone])}>
                  {reaction.headline}
                </p>

                {reaction.tone !== "good" && (
                  <div className="mt-3">
                    <textarea
                      autoFocus
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Spill it — we can take it."
                      rows={3}
                      className="w-full resize-none rounded-[10px] border border-input bg-background p-2.5 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                    />
                    <div className="mt-2.5 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={reset}
                        className="rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        onClick={submitComment}
                        disabled={submitting || !comment.trim()}
                        className="rounded-full bg-foreground px-3.5 py-1.5 text-[13px] font-medium text-background hover:opacity-90 disabled:opacity-40"
                      >
                        {submitting ? "Sending…" : "Send"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {stage === "done" && (
              <div className="mt-2">
                <p className="text-[17px] font-semibold text-foreground">Thanks — genuinely.</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  No confetti. We're saving that for a bigger moment.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
