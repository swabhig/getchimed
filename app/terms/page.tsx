// app/terms/page.tsx
//
// Bare-bones terms of service — enough to satisfy Google OAuth's consent
// screen requirement. Not a substitute for legal review.

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: July 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-7 text-foreground/90">
        <p>
          By using Chime, you agree to these terms. Chime is an early-stage
          (beta) tool — please read this before uploading customer data.
        </p>

        <div>
          <h2 className="text-lg font-medium text-foreground mb-2">The service</h2>
          <p>
            Chime analyzes NPS survey feedback you upload, using AI to cluster
            responses into themes and generate insights. You're responsible
            for having the right to use and upload any survey data you provide.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-medium text-foreground mb-2">Beta status</h2>
          <p>
            Chime is under active development. Features may change, and we
            can't guarantee uninterrupted availability or that results will be
            error-free. Use your own judgment before acting on any analysis.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-medium text-foreground mb-2">Your data</h2>
          <p>
            You retain ownership of any data you upload. We don't sell it or
            use it to train models beyond what's needed to generate your
            analysis. See our Privacy Policy for details.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-medium text-foreground mb-2">Limitation of liability</h2>
          <p>
            Chime is provided "as is," without warranties of any kind. We
            aren't liable for decisions made based on the app's output.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-medium text-foreground mb-2">Changes</h2>
          <p>
            We may update these terms as the product evolves. Continued use
            after changes means you accept the updated terms.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-medium text-foreground mb-2">Contact</h2>
          <p>
            Questions? Email{" "}
            <a href="mailto:hello@getchimed.site" className="underline underline-offset-2">
              hello@getchimed.site
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
