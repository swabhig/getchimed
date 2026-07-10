import Link from "next/link"

export default function BackgroundComparison() {
  const options = [
    {
      id: 1,
      name: "Option 1: Radial Glow",
      description: "Soft orange radial gradient with particle effects. Warm, welcoming sunrise feeling.",
      image: "/.v0/bg-option-1-radial-glow.png",
      pros: ["Warm & inviting", "Draws focus to center", "Professional feel"],
    },
    {
      id: 2,
      name: "Option 2: Tech Wireframe",
      description: "Dark background with orange circuit patterns. Sophisticated but technical.",
      image: "/.v0/bg-option-2-tech-wireframe.png",
      pros: ["Sophisticated", "Modern tech vibe", "Enterprise-ready"],
      cons: ["May feel too heavy"],
    },
    {
      id: 3,
      name: "Option 3: Soft Bokeh",
      description: "Blurred organic shapes in warm peach/orange. Clean and non-intrusive.",
      image: "/.v0/bg-option-3-soft-bokeh.png",
      pros: ["Clean & professional", "Non-distracting", "Perfect balance"],
      recommended: true,
    },
    {
      id: 4,
      name: "Option 4: Minimal Gradient",
      description: "Subtle warm gradient with faint geometric accents. Understated elegance.",
      image: "/.v0/bg-option-4-minimal-gradient.png",
      pros: ["Minimalist", "Very professional", "Safe choice"],
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <Link href="/" className="text-sm font-medium text-foreground hover:text-brand-accent">
            ← Back to landing
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Background Design Comparison</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose which background best suits your landing page</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2">
          {options.map((option) => (
            <div key={option.id} className="flex flex-col">
              <div className="relative mb-4 overflow-hidden rounded-lg border border-border bg-muted">
                <img
                  src={option.image}
                  alt={option.name}
                  className="h-80 w-full object-cover"
                />
                {option.recommended && (
                  <div className="absolute right-3 top-3 rounded-full bg-brand-accent px-3 py-1 text-xs font-semibold text-background">
                    RECOMMENDED
                  </div>
                )}
              </div>

              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                {option.name}
                {option.recommended && <span className="text-brand-accent">●</span>}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>

              <div className="mt-4 space-y-2">
                <div>
                  <p className="text-xs font-semibold text-foreground">Pros:</p>
                  <ul className="mt-1 space-y-1">
                    {option.pros.map((pro, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground">
                        ✓ {pro}
                      </li>
                    ))}
                  </ul>
                </div>

                {option.cons && (
                  <div>
                    <p className="text-xs font-semibold text-foreground">Cons:</p>
                    <ul className="mt-1 space-y-1">
                      {option.cons.map((con, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground">
                          ✗ {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button className="mt-4 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80">
                Apply Option {option.id}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-lg border border-border bg-muted/50 p-6">
          <h3 className="text-sm font-semibold text-foreground">Recommendation</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            <strong>Option 3: Soft Bokeh</strong> is recommended. It perfectly complements your warm orange palette (#FF6B35),
            adds visual depth without distracting from your hero content, and feels modern + approachable — ideal for an NPS
            insights tool targeting SaaS product teams.
          </p>
        </div>
      </main>
    </div>
  )
}
