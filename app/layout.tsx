import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Caveat } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { RatePageWidget } from '@/components/rate-page-widget'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const caveat = Caveat({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-caveat' })

export const metadata: Metadata = {
  title: 'getchimed',
  description: 'getchimed — Turn NPS survey responses into themes, flags, and an action list.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`bg-background ${geistSans.variable} ${geistMono.variable} ${caveat.variable}`} suppressHydrationWarning>
      <body className="flex min-h-svh flex-col font-sans antialiased">
        <ThemeProvider>
          <div className="flex-1">{children}</div>
          <footer className="border-t border-border bg-background shrink-0">
            <div className="mx-auto max-w-5xl px-3 sm:px-4 py-1.5 sm:py-2 text-center text-xs text-muted-foreground">
              <div className="flex flex-col items-center justify-center gap-1 sm:gap-2 lg:gap-3 sm:flex-row">
                <div className="text-xs sm:text-xs">
                  Methodology inspired by{' '}
                  <a
                    href="https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Superhuman
                  </a>
                </div>
                <span className="hidden sm:inline text-xs">·</span>
                <a
                  href="https://wa.me/+919810040184"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:underline text-xs"
                >
                  Feedback
                </a>
                <span className="text-xs">·</span>
                <a href="/privacy" className="hover:text-foreground hover:underline text-xs">
                  Privacy
                </a>
                <span className="text-xs">·</span>
                <a href="/terms" className="hover:text-foreground hover:underline text-xs">
                  Terms
                </a>
                <span className="text-xs">·</span>
                <a
                  href="https://twelve.tools"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Featured on Twelve Tools"
                  className="inline-flex items-center"
                >
                  <img
                    src="https://twelve.tools/badge0-white.svg"
                    alt="Featured on Twelve Tools"
                    width={148}
                    height={40}
                  />
                </a>
              </div>
            </div>
          </footer>
          <RatePageWidget />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
