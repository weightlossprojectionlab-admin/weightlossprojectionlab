'use client'

/**
 * Tenant Branding Component
 *
 * Injects tenant-specific CSS variables to override the default WPL theme.
 * When no tenant is active (WPL direct), renders nothing — zero impact.
 *
 * Place this inside the TenantProvider in the component tree.
 * It reads branding from TenantContext and overrides :root CSS variables.
 */

import { useTenant } from '@/contexts/TenantContext'

export default function TenantBranding() {
  const { branding, isFranchise } = useTenant()

  // No tenant = WPL direct. Don't inject anything.
  if (!isFranchise || !branding) return null

  // Only override colors that the tenant has customized
  const overrides: string[] = []

  if (branding.primaryColor) overrides.push(`--primary: ${branding.primaryColor};`)
  if (branding.secondaryColor) overrides.push(`--secondary: ${branding.secondaryColor};`)
  if (branding.accentColor) overrides.push(`--accent: ${branding.accentColor};`)

  if (overrides.length === 0) return null

  return (
    <style dangerouslySetInnerHTML={{ __html: `:root { ${overrides.join(' ')} }` }} />
  )
}
