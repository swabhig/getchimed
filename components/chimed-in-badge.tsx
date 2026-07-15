"use client"

import { useEffect, useRef, useState } from "react"
import { Bell } from "lucide-react"

// "Found it." badge — a one-time reward shown after a person's first
// completed analysis, per the Claude Design handoff. Trigger logic
// (localStorage-gated, fires once ever per browser) is unchanged from the
// original component; this is the visual/interaction layer described in
// the handoff: a 3D flip card, a real Web Audio bell chime on tap, and a
// swinging-bell + pulsing-ring entrance.

const STORAGE_KEY = "chime-first-analysis-badge-shown"

function playBell() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new AudioCtx()
    const partials: [number, number, number][] = [
      [660, 0.16, 1.6],
      [990, 0.09, 1.2],
      [1650, 0.05, 0.9],
    ]
    partials.forEach(([freq, gain, decay]) => {
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      gainNode.gain.setValueAtTime(gain, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decay)
      osc.connect(gainNode)
      gainNode.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + decay)
    })
  } catch {
    // Web Audio unavailable — non-critical, silently skip the sound.
  }
}

export function ChimedInBadge() {
  const [visible, setVisible] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (localStorage.getItem(STORAGE_KEY)) return

    localStorage.setItem(STORAGE_KEY, "1")
    setVisible(true)

    // Untapped: show 5000ms, then fade, remove at 5500ms.
    dismissTimer.current = setTimeout(() => {
      setDismissing(true)
      setTimeout(() => setVisible(false), 500)
    }, 5000)

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
  }, [])

  function handleTap() {
    if (revealed) return
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    playBell()
    setRevealed(true)

    // Tapped: reveal, fade starting at 2400ms, remove at 2900ms.
    setTimeout(() => {
      setDismissing(true)
      setTimeout(() => setVisible(false), 500)
    }, 2400)
  }

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes chime-ring {
          0% { transform: scale(0.6); opacity: 0.55; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes chime-bell-swing {
          0% { transform: rotate(0deg); }
          20% { transform: rotate(-18deg); }
          40% { transform: rotate(14deg); }
          60% { transform: rotate(-9deg); }
          80% { transform: rotate(5deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes chime-pop-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .chime-badge-ring {
          animation: chime-ring 1.2s ease-out 2;
        }
        .chime-badge-bell {
          animation: chime-bell-swing 1s ease-in-out 5;
          transform-origin: top center;
        }
        .chime-badge-flip {
          perspective: 700px;
        }
        .chime-badge-flip-inner {
          transition: transform 0.55s cubic-bezier(.4,.2,.2,1);
          transform-style: preserve-3d;
        }
        .chime-badge-flip-inner.revealed {
          transform: rotateY(180deg);
        }
        .chime-badge-face {
          backface-visibility: hidden;
        }
        .chime-badge-face-back {
          transform: rotateY(180deg);
        }
      `}</style>
      <div
        className="fixed z-40 left-1/2 -translate-x-1/2"
        style={{
          top: 76,
          opacity: dismissing ? 0 : 1,
          transform: `translateX(-50%) ${dismissing ? "translateY(-6px)" : "translateY(0)"}`,
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        <div className="chime-badge-flip" style={{ width: 220, height: 52 }}>
          <div className={`chime-badge-flip-inner relative w-full h-full ${revealed ? "revealed" : ""}`}>
            {/* Front face — just the bell, no text */}
            <div className="chime-badge-face absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={handleTap}
                aria-label="See what you found"
                className="relative flex size-[46px] items-center justify-center rounded-full bg-foreground text-background shadow-lg"
              >
                <span className="chime-badge-ring absolute inset-0 rounded-full border-2 border-brand-accent" />
                <Bell className="chime-badge-bell size-5 text-brand-accent" fill="currentColor" strokeWidth={1} />
              </button>
            </div>

            {/* Back face — revealed after tap */}
            <div
              className="chime-badge-face chime-badge-face-back absolute inset-0 flex items-center gap-2.5 rounded-2xl bg-foreground px-4 text-background"
              style={{ animation: revealed ? "chime-pop-in 0.3s ease" : "none" }}
            >
              <span className="size-2 shrink-0 rounded-full bg-brand-accent" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-tight">Found it.</p>
                <p className="text-[11px] leading-tight opacity-60">That's your first chime.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
