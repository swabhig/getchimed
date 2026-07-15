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
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (localStorage.getItem(STORAGE_KEY)) return

    localStorage.setItem(STORAGE_KEY, "1")
    setVisible(true)
  }, [])

  function handleTap() {
    if (revealed) return
    playBell()
    setRevealed(true)
  }

  function handleDismiss() {
    setVisible(false)
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
        className="absolute z-40 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          animation: "chime-pop-in 0.3s ease",
        }}
      >
        <div className="chime-badge-flip" style={{ width: 280, height: 120 }}>
          <div className={`chime-badge-flip-inner relative w-full h-full ${revealed ? "revealed" : ""}`}>
            {/* Front face — bell button */}
            <div className="chime-badge-face absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={handleTap}
                aria-label="See what you found"
                className="relative flex size-[52px] items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:shadow-xl transition-shadow"
              >
                <span className="chime-badge-ring absolute inset-0 rounded-full border-2 border-brand-accent" />
                <Bell className="chime-badge-bell size-6 text-brand-accent" fill="currentColor" strokeWidth={1} />
              </button>
            </div>

            {/* Back face — revealed after tap with close button */}
            <div
              className="chime-badge-face chime-badge-face-back absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-foreground p-5 text-background"
              style={{ animation: revealed ? "chime-pop-in 0.3s ease" : "none" }}
            >
              <div className="text-center">
                <p className="text-sm font-semibold leading-tight">Found it.</p>
                <p className="text-xs leading-tight opacity-60 mt-1">That's your first chime.</p>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-accent text-foreground hover:opacity-90 transition-opacity"
              >
                Nice
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
