/**
 * Public, branded care-package proposal.
 *
 * The link an agency sends a family. Server component: resolves the proposal by
 * its unguessable shareToken via a collection-group query (admin SDK), reads
 * the stored tenantId, loads that tenant's branding, and renders the FROZEN
 * packagesSnapshot wearing the agency's brand (logo, company name, primary
 * color). No client-side Firestore read — so no broad public read rule is
 * needed, and there's no way to enumerate other proposals.
 *
 * The token IS the document id in the top-level `proposals` collection, so the
 * lookup is an O(1) direct get — no collection-group index required.
 */

import { notFound } from 'next/navigation'
import { getAdminDb } from '@/lib/firebase-admin'
import { getTenantById } from '@/lib/tenant-server'
import { hslToCss } from '@/lib/tenant-branding'
import { formatMoney, sortPackages, TIER_META } from '@/lib/care-packages'
import { logger } from '@/lib/logger'
import type { CarePackage, ProposalRecord, Tenant } from '@/types/tenant'

export const dynamic = 'force-dynamic'

async function loadProposal(token: string): Promise<ProposalRecord | null> {
  try {
    const snap = await getAdminDb().collection('proposals').doc(token).get()
    if (!snap.exists) return null
    return { ...(snap.data() as Omit<ProposalRecord, 'id'>), id: snap.id }
  } catch (err) {
    logger.error('[pricing-proposal] token lookup failed', err as Error)
    return null
  }
}

export default async function PricingProposalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  if (!token) notFound()

  const proposal = await loadProposal(token)
  if (!proposal) notFound()

  const tenant: Tenant | null = await getTenantById(proposal.tenantId)
  const branding = tenant?.branding
  const companyName = branding?.companyName || tenant?.name || 'Your care team'
  const primary = hslToCss(branding?.primaryColor)

  const packages = sortPackages(proposal.packagesSnapshot || [])

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Branded header */}
      <header className="border-b border-gray-200 bg-white" style={{ borderTopWidth: 4, borderTopColor: primary }}>
        <div className="mx-auto max-w-5xl px-4 py-8 flex items-center gap-4">
          {branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt={`${companyName} logo`}
              className="h-12 w-12 object-contain rounded bg-white border border-gray-200"
            />
          ) : null}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{companyName}</h1>
            {branding?.tagline ? <p className="text-sm text-gray-500">{branding.tagline}</p> : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900">Your care plan options</h2>
          {proposal.clientName ? (
            <p className="text-sm text-gray-600 mt-1">Prepared for {proposal.clientName}</p>
          ) : null}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map(pkg => {
            const recommended = pkg.tier === 'core'
            return (
              <section
                key={pkg.id}
                className="rounded-2xl bg-white p-6 flex flex-col shadow-sm"
                style={{
                  border: recommended ? `2px solid ${primary}` : '1px solid rgb(229 231 235)',
                }}
              >
                {recommended && (
                  <span
                    className="self-start rounded-full px-3 py-1 text-xs font-semibold text-white mb-3"
                    style={{ backgroundColor: primary }}
                  >
                    Recommended
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                {pkg.tier ? <p className="text-xs text-gray-400 mt-0.5">{TIER_META[pkg.tier].blurb}</p> : null}
                <p className="mt-4 text-3xl font-bold" style={{ color: primary }}>
                  {formatMoney(pkg.monthlyPrice, pkg.currency)}
                  <span className="text-base font-normal text-gray-500">/mo</span>
                </p>

                {pkg.included?.length > 0 && (
                  <ul className="mt-5 space-y-2 text-sm text-gray-700 flex-1">
                    {pkg.included.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span aria-hidden style={{ color: primary }}>✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {pkg.excluded?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">Not included</p>
                    <ul className="space-y-1 text-sm text-gray-400">
                      {pkg.excluded.map((item, i) => (
                        <li key={i} className="flex gap-2">
                          <span aria-hidden>–</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <footer className="mt-10 text-center text-sm text-gray-500">
          {branding?.supportEmail ? (
            <p>
              Questions? Contact us at{' '}
              <a href={`mailto:${branding.supportEmail}`} className="underline" style={{ color: primary }}>
                {branding.supportEmail}
              </a>
              .
            </p>
          ) : (
            <p>Reach out to {companyName} to get started.</p>
          )}
        </footer>
      </div>
    </main>
  )
}
