import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <p className="select-none text-[120px] font-black leading-none text-muted-foreground/20 sm:text-[160px]">
        404
      </p>
      <p className="-mt-4 text-lg font-medium text-foreground">Nothing chimes here.</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90"
      >
        Back to Chime →
      </Link>
      <div className="mt-10 flex gap-4 text-xs text-muted-foreground">
        <Link href="/about" className="hover:text-foreground">
          About
        </Link>
        <Link href="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          Terms
        </Link>
      </div>
    </div>
  )
}
