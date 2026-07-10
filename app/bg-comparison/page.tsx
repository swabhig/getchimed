import Link from "next/link"

export default function BackgroundComparison() {
  const options = [
    {
      id: 1,
      name: "Option 1: Radial Glow",
      description: "Soft orange radial gradient with particle effects. Warm, welcoming sunrise feeling.",
      imageLight: "/bg-option-1-radial-glow.png",
      imageDark: "/bg-option-1-radial-glow-dark.png",
      pros: ["Warm & inviting", "Draws focus to center", "Professional feel"],
    },
    {
      id: 2,
      name: "Option 2: Tech Wireframe",
      description: "Orange circuit patterns with tech elements. Sophisticated but technical.",
      imageLight: "/bg-option-2-tech-wireframe.png",
      imageDark: "/bg-option-2-tech-wireframe-dark.png",
      pros: ["Sophisticated", "Modern tech vibe", "Enterprise-ready"],
      cons: ["May feel too heavy"],
    },
    {
      id: 3,
      name: "Option 3: Soft Bokeh",
      description: "Blurred organic shapes in warm peach/orange. Clean and non-intrusive.",
      imageLight: "/bg-option-3-soft-bokeh.png",
      imageDark: "/bg-option-3-soft-bokeh-dark.png",
      pros: ["Clean & professional", "Non-distracting", "Perfect balance"],
      recommended: true,
    },
    {
      id: 4,
      name: "Option 4: Minimal Gradient",
      description: "Subtle warm gradient with faint geometric accents. Understated elegance.",
      imageLight: "/bg-option-4-minimal-gradient.png",
      imageDark: "/bg-option-4-minimal-gradient-dark.png",
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
          <p className="mt-1 text-sm text-muted-foreground">Light & Dark Mode - Choose which background best suits your landing page</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-12">
          {options.map((option) => (
            <div key={option.id} className="rounded-lg border border-border bg-card p-6">
              <div className="mb-6">
                <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                  {option.name}
                  {option.recommended && <span className="rounded-full bg-brand-accent px-2 py-1 text-xs font-semibold text-background">RECOMMENDED</span>}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{option.description}</p>
              </div>

              {/* Light and Dark Mode Side-by-Side */}
              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="mb-2 text-xs font-semibold text-foreground">Light Mode</p>
                  <div className="relative overflow-hidden rounded-lg border border-border bg-muted">
                    <img
                      src={option.imageLight}
                      alt={`${option.name} - Light Mode`}
                      className="h-64 w-full object-cover"
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-foreground">Dark Mode</p>
                  <div className="relative overflow-hidden rounded-lg border border-border bg-muted">
                    <img
                      src={option.imageDark}
                      alt={`${option.name} - Dark Mode`}
                      className="h-64 w-full object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Pros:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {option.pros.map((pro, idx) => (
                      <li key={idx}>✓ {pro}</li>
                    ))}
                  </ul>
                </div>

                {option.cons && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Cons:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {option.cons.map((con, idx) => (
                        <li key={idx}>✗ {con}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button className="px-4 py-2 rounded-lg bg-brand-accent text-white font-medium hover:opacity-90 transition">
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
