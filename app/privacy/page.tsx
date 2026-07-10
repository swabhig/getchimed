// app/privacy/page.tsx
//
// Bare-bones privacy policy — enough to satisfy Google OAuth's consent
// screen requirement. Not a substitute for legal review.

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: July 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-7 text-foreground/90">
        <p>
          Chime ("we," "our," "us") is a tool for analyzing NPS survey feedback.
          This page explains what data we collect and how it's used.
        </p>

        <div>
          <h2 className="text-lg font-medium text-foreground mb-2">What we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account info from Google Sign-In: your name and email address.</li>
            <li>
              Survey data you upload: NPS scores, open-text responses, and any
              persona/context fields you choose to include.
            </li>
            <li>Basic usage data needed to run the app (e.g. saved analyses tied to your account).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-medium text-foreground mb-2">How we use it</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To run the analysis you request (clustering feedback into themes).</li>
            <li>To save your past analyses so you can access them later.</li>
            <li>To personalize the app with your name.</li>
          </ul>
          <p className="mt-2">
            Survey responses you upload are sent to Anthropic's Claude API for
            analysis. We do not sell your data, and we do not use it for advertising.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-medium text-foreground mb-2">Where it's stored</h2>
          <p>Data is stored using Supabase. You can request deletion of your data at any time by contacting us.</p>
        </div>

        <div>
          <h2 className="text-lg font-medium text-foreground mb-2">Third parties</h2>
          <p>
            We use Google (for sign-in), Supabase (for data storage), and Anthropic
            (for analysis). Each has their own privacy practices governing how they
            handle data on our behalf.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-medium text-foreground mb-2">Contact</h2>
          <p>
            Questions about this policy or your data? Email{" "}
            <a href="mailto:hello@getchimed.site" className="underline underline-offset-2">
              hello@getchimed.site
            </a>
            .
          </p>
        </div>

        <p className="text-sm text-foreground/60 pt-4 border-t border-border">
          This is a basic policy for an early-stage tool and may be updated as
          Chime grows.
        </p>
      </div>
    </main>
  )
}
