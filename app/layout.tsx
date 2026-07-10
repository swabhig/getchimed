import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Caveat } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const caveat = Caveat({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-caveat' })

export const metadata: Metadata = {
  title: 'getchimed',
  description: 'Turn NPS survey responses into themes, flags, and an action list.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icons/chime-icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/chime-icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/chime-icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/chime-icon-180.png',
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
          <footer className="border-t border-border bg-background">
            <div className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground">
              Methodology inspired by{' '}
              <a
                href="https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Rahul Vohra&apos;s PMF engine at Superhuman
              </a>
            </div>
          </footer>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
