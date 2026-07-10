'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LogOut, MessageCircle, BookOpen } from 'lucide-react'
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
    <aside className="w-64 border-r border-border bg-background flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-bold text-sm text-foreground">Your Analyses</h2>
        <p className="text-xs text-muted-foreground mt-1">Max 4 surveys saved</p>
      </div>

      {/* Analyses List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
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
        {/* Profile — click to sign out */}
        <button
          onClick={onSignOut}
          title="Sign out"
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

        <a
          href="https://wa.me/+919810040184"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <MessageCircle className="size-4" />
          WhatsApp
        </a>

        <Link
          href="/about"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <BookOpen className="size-4" />
          Methodology
        </Link>

        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
