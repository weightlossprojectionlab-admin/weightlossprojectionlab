import type { FAQItem } from '@/lib/json-ld'

/**
 * FAQ accordion — the on-page render half of the FAQ-as-single-source pattern.
 * Pass the same `FAQ_ITEMS` const you feed to `faqPageSchema(...)` so the
 * visible content and the FAQPage structured data never drift.
 */
export function FaqAccordion({ items, heading = 'Frequently Asked Questions', intro }: {
  items: FAQItem[]
  heading?: string
  intro?: string
}) {
  return (
    <section aria-labelledby="faq-heading" className="mb-20">
      <h2 id="faq-heading" className="text-4xl font-bold text-foreground mb-4 text-center">{heading}</h2>
      {intro && (
        <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">{intro}</p>
      )}
      <div className="max-w-3xl mx-auto space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className="group bg-card rounded-xl border-2 border-border p-5 open:shadow-md transition-shadow"
          >
            <summary className="cursor-pointer list-none font-semibold text-foreground flex items-start justify-between gap-4">
              <span>{item.question}</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-xl leading-none group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
