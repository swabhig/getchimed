import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-4 px-6">
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <span>For feedback, connect on</span>
        <a
          href="https://wa.me/+919810040184"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
        >
          <MessageCircle className="size-3" />
          WhatsApp
        </a>
      </div>
    </footer>
  )
}
