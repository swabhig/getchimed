'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, LogIn } from 'lucide-react'
import { AnalysisResult } from '@/lib/nps-data'
import { getFirstName, getAvatarUrl } from '@/lib/user'

interface PastAnalysis {
  id: string
  created_at: string
  analysis_data: AnalysisResult
}

interface SidebarProps {
  user: any
  onSelectAnalysis: (analysis: AnalysisResult) => void
  onSignOut: () => void
  currentAnalysisId?: string
}

export function Sidebar({ user, onSelectAnalysis, onSignOut, currentAnalysisId }: SidebarProps) {
  const [analyses, setAnalyses] = useState<PastAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Same Google popup sign-in flow used elsewhere (upload screen). The
  // opener window's onAuthStateChange listener (in page.tsx) picks up the
  // session and re-renders the sidebar into its signed-in state.
  async function handleSignIn() {
    setSigningIn(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    })

    if (error || !data?.url) {
      console.error('[chime] Sidebar sign-in error:', error)
      setSigningIn(false)
      return
    }

    const popup = window.open(data.url, 'google-oauth', 'width=480,height=640')
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        listener.subscription.unsubscribe()
        popup?.close()
        setSigningIn(false)
      }
    })
  }

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchAnalyses = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('user_analyses')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4)

        if (error) {
          console.error('[v0] Failed to fetch analyses:', error)
        } else {
          setAnalyses(data || [])
        }
      } catch (error) {
        console.error('[v0] Error fetching analyses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyses()
  }, [user])

  return (
    <aside className="w-[272px] border-r border-sidebar-border bg-sidebar flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your analyses</h2>
      </div>

      {/* Analyses List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {!user ? (
          <div className="rounded-xl border border-dashed border-sidebar-border p-4 text-center">
            <div className="mx-auto mb-2.5 flex size-7 items-center justify-center rounded-full bg-muted">
              <span className="size-2.5 rounded-sm border-[1.5px] border-muted-foreground" />
            </div>
            <p className="text-[12.5px] font-semibold text-foreground">No saved analyses yet</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
              Sign in to save up to 4 and pick up where you left off.
            </p>
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <LogIn className="size-4" />
              {signingIn ? 'Signing in...' : 'Sign in with Google'}
            </button>
          </div>
        ) : loading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : analyses.length === 0 ? (
          <p className="text-xs text-muted-foreground">No saved analyses yet</p>
        ) : (
          analyses.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectAnalysis(item.analysis_data)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                currentAnalysisId === item.id
                  ? 'bg-muted border-foreground/20'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <p className="text-xs font-medium text-foreground truncate">
                {item.analysis_data?.context?.industry || 'Survey'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {new Date(item.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Footer Links */}
      <div className="p-4 border-t border-border space-y-2">
        {/* Profile (signed in) — click opens a dropdown, doesn't sign out directly */}
        {user && (
          <div ref={menuRef} className="relative">
            {menuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full rounded-lg border border-border bg-background shadow-lg py-1 z-10">
                <Link
                  href="/about"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  How the magic works
                </Link>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="w-full text-left block px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onSignOut()
                  }}
                  className="w-full text-left block px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors border-t border-border"
                >
                  Sign out
                </button>
              </div>
            )}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              title={getFirstName(user)}
              aria-expanded={menuOpen}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              {getAvatarUrl(user) ? (
                <img
                  src={getAvatarUrl(user) as string}
                  alt=""
                  className="size-7 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground uppercase">
                  {getFirstName(user).charAt(0)}
                </span>
              )}
              <span className="text-sm font-medium text-foreground truncate">{getFirstName(user)}</span>
            </button>
          </div>
        )}

        {/* Sign in (guest) */}
        {!user && (
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-muted text-foreground">
              <LogIn className="size-4" />
            </span>
            <span className="text-sm font-medium text-foreground truncate">
              {signingIn ? 'Signing in...' : 'Sign in'}
            </span>
          </button>
        )}

        <a
          href="https://wa.me/+919810040184"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <MessageCircle className="size-4" />
          WhatsApp
        </a>

        {/* Guests still see this link directly, since they have no profile dropdown */}
        {!user && (
          <Link
            href="/about"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            How the magic works
          </Link>
        )}
      </div>
    </aside>
  )
}
