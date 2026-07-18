/**
 * Key Takeaway box — a 1–2 sentence summary for readers who scan rather than
 * read top to bottom (common for a tired caregiver). Place near the top of a
 * post. Also gives AI Overviews a clean, self-contained answer to lift.
 */
export function KeyTakeaway({ children }: { children: React.ReactNode }) {
  return (
    <aside
      aria-label="Key takeaway"
      className="rounded-xl border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 p-5"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-1">
        Key takeaway
      </div>
      <p className="text-sm leading-relaxed text-foreground m-0">{children}</p>
    </aside>
  )
}
