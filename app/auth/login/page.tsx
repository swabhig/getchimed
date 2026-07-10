'use client'

import Link from 'next/link'
import Head from 'next/head'

export default function LoginPage() {
  return (
    <>
      <Head>
        <style>{`
          @keyframes shimmer-chime {
            0% {
              background-position: -1000px 0;
            }
            100% {
              background-position: 1000px 0;
            }
          }
          
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-8px);
            }
          }
          
          .animate-shimmer-chime {
            background: linear-gradient(
              90deg,
              #fbbf24,
              #f59e0b,
              #fbbf24
            );
            background-size: 1000px 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: shimmer-chime 3s infinite;
          }
          
          .animate-float-chime {
            animation: float 2s ease-in-out infinite;
          }
        `}</style>
      </Head>
      <div className="flex min-h-svh flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-12 text-center">
          {/* Hero headline with animated "chime" */}
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl text-balance leading-tight">
                Beyond the score,
              </p>
              <p className="text-5xl font-black sm:text-6xl text-balance leading-tight animate-shimmer-chime animate-float-chime inline-block w-full">
                chime.
              </p>
            </div>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Turn NPS feedback into action without losing the nuance in a spreadsheet.
            </p>
          </div>

          {/* CTA text with arrow */}
          <div className="space-y-6 pt-4">
            <div className="rounded-lg border border-border bg-muted/50 p-6">
              <p className="text-sm leading-relaxed text-foreground">
                Upload your survey responses. Map your columns. Let getChimed analyze what your customers are really saying.
              </p>
            </div>
            <Link
              href="/auth/login/start"
              className="inline-flex items-center gap-2 rounded-lg bg-promoter px-6 py-3 text-base font-semibold text-white hover:bg-promoter/90 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Get started →
            </Link>
          </div>

          {/* Footer link */}
          <div className="border-t border-border pt-8">
            <a href="/about" className="text-sm text-promoter underline-offset-4 hover:underline">
              Learn about getChimed →
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
