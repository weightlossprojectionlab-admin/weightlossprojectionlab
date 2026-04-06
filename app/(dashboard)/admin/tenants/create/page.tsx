'use client'

/**
 * Admin Franchise Creation — Full Order Form
 *
 * Same comprehensive fields as the public /franchise page,
 * but accessible from the admin panel during demo calls.
 * Admin can fill in all details while on a call with the prospect.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getAdminAuthToken } from '@/lib/admin/api'
import { getCSRFToken } from '@/lib/csrf'
import { ArrowLeftIcon, CheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import toast from 'react-hot-toast'

const PRACTICE_TYPES = [
  'Solo Nurse / Caregiver',
  'Wellness Coach',
  'Concierge Doctor',
  'Home Care Agency',
  'Patient Advocate',
  'Other',
]

const ENTITY_TYPES = [
  'Sole Proprietorship', 'LLC', 'Corporation', 'Partnership', 'Non-Profit', 'Other',
]

const LEAD_SOURCES = [
  'LinkedIn', 'Google Search', 'Referral', 'Social Media', 'Conference/Event', 'Demo Call', 'Cold Outreach', 'Other',
]

const PLANS = [
  { id: 'starter', name: 'Starter', monthlyBase: 750, perSeat: 35, maxSeats: 5, maxClients: 50, ai: 'Basic AI', support: 'Email support', popular: false },
  { id: 'professional', name: 'Professional', monthlyBase: 1250, perSeat: 35, maxSeats: 15, maxClients: 200, ai: 'Full AI Suite', support: 'Priority support', popular: true },
  { id: 'enterprise', name: 'Enterprise', monthlyBase: 2000, perSeat: 25, maxSeats: -1, maxClients: -1, ai: 'Full AI Suite', support: 'Dedicated account manager', popular: false },
]

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      {children}
    </div>
  )
}

const inputClass = "w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
const selectClass = `${inputClass} bg-background`

export default function AdminCreateTenantPage() {
  const router = useRouter()
  const { isAdmin } = useAdminAuth()

  // Business info
  const [businessName, setBusinessName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [entityType, setEntityType] = useState('')
  const [ein, setEin] = useState('')
  const [stateOfIncorporation, setStateOfIncorporation] = useState('')

  // Contact
  const [contactName, setContactName] = useState('')
  const [contactTitle, setContactTitle] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')

  // Address
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')

  // Billing
  const [billingSame, setBillingSame] = useState(true)
  const [billingAddress, setBillingAddress] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingState, setBillingState] = useState('')
  const [billingZip, setBillingZip] = useState('')
  const [billingContact, setBillingContact] = useState('')
  const [billingEmail, setBillingEmail] = useState('')

  // Practice
  const [practiceType, setPracticeType] = useState('')
  const [otherPractice, setOtherPractice] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [npiNumber, setNpiNumber] = useState('')
  const [staffCount, setStaffCount] = useState('1-5')
  const [familyCount, setFamilyCount] = useState('')

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyEmail, setEmergencyEmail] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')

  // Plan
  const [selectedPlan, setSelectedPlan] = useState('professional')
  const [billingTerm, setBillingTerm] = useState<'monthly' | 'annual'>('monthly')

  // Subdomain
  const [subdomain, setSubdomain] = useState('')
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null)
  const [checkingSubdomain, setCheckingSubdomain] = useState(false)

  // Additional
  const [launchDate, setLaunchDate] = useState('')
  const [leadSource, setLeadSource] = useState('Demo Call')
  const [notes, setNotes] = useState('')
  const [initialStatus, setInitialStatus] = useState('pending_payment')

  const [saving, setSaving] = useState(false)

  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value)
    setSubdomain(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    setSubdomainAvailable(null)
  }

  const checkSubdomain = async () => {
    if (!subdomain) return
    setCheckingSubdomain(true)
    try {
      const res = await fetch(`/api/admin/tenants/check-slug?slug=${subdomain}`)
      const data = await res.json()
      setSubdomainAvailable(data.available)
    } catch {
      setSubdomainAvailable(null)
    } finally {
      setCheckingSubdomain(false)
    }
  }

  const planData = PLANS.find(p => p.id === selectedPlan)!
  const displayPrice = billingTerm === 'annual' ? Math.round(planData.monthlyBase * 0.85) : planData.monthlyBase

  const handleCreate = async () => {
    if (!businessName || !contactName || !email || !subdomain) {
      toast.error('Business name, contact name, email, and subdomain are required')
      return
    }

    setSaving(true)
    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()

      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          name: businessName,
          slug: subdomain,
          adminEmail: email,
          adminName: contactName,
          phone,
          // Extended fields
          legalName: legalName || businessName,
          entityType,
          ein,
          stateOfIncorporation,
          contactTitle,
          website,
          address,
          city,
          state,
          zip,
          billingSameAsAddress: billingSame,
          billingAddress: billingSame ? address : billingAddress,
          billingCity: billingSame ? city : billingCity,
          billingState: billingSame ? state : billingState,
          billingZip: billingSame ? zip : billingZip,
          billingContact: billingSame ? contactName : billingContact,
          billingEmail: billingEmail || email,
          practiceType: practiceType === 'Other' ? otherPractice : practiceType,
          licenseNumber,
          npiNumber,
          staffCount,
          familyCount: parseInt(familyCount) || 0,
          emergencyContact: { name: emergencyName, email: emergencyEmail, phone: emergencyPhone },
          billing: {
            plan: selectedPlan,
            maxSeats: planData.maxSeats === -1 ? 999 : planData.maxSeats,
            monthlyBaseRate: displayPrice * 100,
            perSeatRate: planData.perSeat * 100,
            billingEmail: billingEmail || email,
            setupFeeAmount: 300000,
          },
          billingTerm,
          expectedLaunchDate: launchDate,
          leadSource,
          notes,
          status: initialStatus,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create')

      toast.success(`Franchise "${businessName}" created!`)
      router.push('/admin/tenants')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create franchise')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-600">Access Denied</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/admin/tenants" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeftIcon className="h-5 w-5" /> Back to Franchises
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New Franchise</h1>
          <p className="text-muted-foreground mt-1">Complete franchise order form — fill in during demo call</p>
        </div>
        <div>
          <FormField label="Initial Status">
            <select value={initialStatus} onChange={e => setInitialStatus(e.target.value)} className={selectClass}>
              <option value="pending_payment">Pending Payment</option>
              <option value="active">Active (skip payment)</option>
              <option value="trial">Trial</option>
            </select>
          </FormField>
        </div>
      </div>

      <div className="space-y-8">

        {/* Section 1: Business & Legal */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Business & Legal Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Business Name (DBA)" required>
                <input type="text" value={businessName} onChange={e => handleBusinessNameChange(e.target.value)} placeholder="Gentle Touch Care" className={inputClass} />
              </FormField>
              <FormField label="Legal Business Name">
                <input type="text" value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="Gentle Touch Care LLC" className={inputClass} />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Entity Type">
                <select value={entityType} onChange={e => setEntityType(e.target.value)} className={selectClass}>
                  <option value="">Select...</option>
                  {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="EIN / Tax ID">
                <input type="text" value={ein} onChange={e => setEin(e.target.value)} placeholder="XX-XXXXXXX" className={inputClass} />
              </FormField>
              <FormField label="State of Incorporation">
                <input type="text" value={stateOfIncorporation} onChange={e => setStateOfIncorporation(e.target.value)} placeholder="New Jersey" className={inputClass} />
              </FormField>
            </div>
          </div>
        </section>

        {/* Section 2: Primary Contact */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Primary Contact</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name" required>
                <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Maria Rodriguez" className={inputClass} />
              </FormField>
              <FormField label="Title / Role">
                <input type="text" value={contactTitle} onChange={e => setContactTitle(e.target.value)} placeholder="Owner, RN" className={inputClass} />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Email" required>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="maria@gentletouch.com" className={inputClass} />
              </FormField>
              <FormField label="Phone">
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputClass} />
              </FormField>
              <FormField label="Website">
                <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." className={inputClass} />
              </FormField>
            </div>
          </div>
        </section>

        {/* Section 3: Address */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Business Address</h2>
          <div className="space-y-4">
            <FormField label="Street Address" required>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, Suite 200" className={inputClass} />
            </FormField>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="City" required><input type="text" value={city} onChange={e => setCity(e.target.value)} className={inputClass} /></FormField>
              <FormField label="State" required><input type="text" value={state} onChange={e => setState(e.target.value)} className={inputClass} /></FormField>
              <FormField label="ZIP" required><input type="text" value={zip} onChange={e => setZip(e.target.value)} className={inputClass} /></FormField>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <input type="checkbox" checked={billingSame} onChange={e => setBillingSame(e.target.checked)} className="h-4 w-4 text-primary rounded" />
                <span className="text-sm text-foreground">Billing address same as business address</span>
              </label>
              {!billingSame && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Billing Contact"><input type="text" value={billingContact} onChange={e => setBillingContact(e.target.value)} className={inputClass} /></FormField>
                    <FormField label="Billing Email"><input type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} className={inputClass} /></FormField>
                  </div>
                  <FormField label="Billing Address"><input type="text" value={billingAddress} onChange={e => setBillingAddress(e.target.value)} className={inputClass} /></FormField>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField label="City"><input type="text" value={billingCity} onChange={e => setBillingCity(e.target.value)} className={inputClass} /></FormField>
                    <FormField label="State"><input type="text" value={billingState} onChange={e => setBillingState(e.target.value)} className={inputClass} /></FormField>
                    <FormField label="ZIP"><input type="text" value={billingZip} onChange={e => setBillingZip(e.target.value)} className={inputClass} /></FormField>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 4: Practice & Credentials */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Practice Details & Credentials</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PRACTICE_TYPES.map(type => (
                <button key={type} onClick={() => setPracticeType(type)} className={`p-3 rounded-lg border-2 text-sm text-left transition-colors ${practiceType === type ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-primary/50'}`}>
                  {type}
                </button>
              ))}
            </div>
            {practiceType === 'Other' && (
              <input type="text" value={otherPractice} onChange={e => setOtherPractice(e.target.value)} placeholder="Describe practice type" className={inputClass} />
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="License / Certification #"><input type="text" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} placeholder="RN-12345678" className={inputClass} /></FormField>
              <FormField label="NPI Number"><input type="text" value={npiNumber} onChange={e => setNpiNumber(e.target.value)} placeholder="1234567890" className={inputClass} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Staff Count">
                <select value={staffCount} onChange={e => setStaffCount(e.target.value)} className={selectClass}>
                  <option value="1">Just me</option>
                  <option value="1-5">1-5</option>
                  <option value="6-15">6-15</option>
                  <option value="16+">16+</option>
                </select>
              </FormField>
              <FormField label="Families Managed"><input type="number" value={familyCount} onChange={e => setFamilyCount(e.target.value)} placeholder="e.g. 25" className={inputClass} /></FormField>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">Emergency / Secondary Contact</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Name"><input type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} className={inputClass} /></FormField>
                <FormField label="Email"><input type="email" value={emergencyEmail} onChange={e => setEmergencyEmail(e.target.value)} className={inputClass} /></FormField>
                <FormField label="Phone"><input type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} className={inputClass} /></FormField>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Plan Selection */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Plan Selection</h2>
          <div className="flex items-center justify-center gap-4 mb-6">
            <button onClick={() => setBillingTerm('monthly')} className={`px-4 py-2 rounded-lg text-sm font-medium ${billingTerm === 'monthly' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>Monthly</button>
            <button onClick={() => setBillingTerm('annual')} className={`px-4 py-2 rounded-lg text-sm font-medium ${billingTerm === 'annual' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>Annual (15% off)</button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {PLANS.map(plan => {
              const price = billingTerm === 'annual' ? Math.round(plan.monthlyBase * 0.85) : plan.monthlyBase
              return (
                <button key={plan.id} onClick={() => setSelectedPlan(plan.id)} className={`relative text-left p-5 rounded-xl border-2 transition-all ${selectedPlan === plan.id ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50'}`}>
                  {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-white text-xs font-bold rounded-full">POPULAR</span>}
                  <h3 className="font-bold text-foreground">{plan.name}</h3>
                  <div className="text-xl font-bold text-primary">${price}<span className="text-xs font-normal text-muted-foreground">/mo</span></div>
                  <div className="text-xs text-muted-foreground mb-3">+${plan.perSeat}/seat/mo</div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>&#x2713; {plan.maxSeats === -1 ? 'Unlimited' : plan.maxSeats} seats</li>
                    <li>&#x2713; {plan.maxClients === -1 ? 'Unlimited' : plan.maxClients} clients</li>
                    <li>&#x2713; {plan.ai}</li>
                    <li>&#x2713; {plan.support}</li>
                  </ul>
                </button>
              )
            })}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3">Setup fee: $3,000 (one-time)</p>
        </section>

        {/* Section 6: Subdomain */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Subdomain</h2>
          <div className="flex items-center gap-2">
            <input type="text" value={subdomain} onChange={e => { setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSubdomainAvailable(null) }} placeholder="gentletouch" className={`flex-1 ${inputClass}`} />
            <span className="text-sm text-muted-foreground whitespace-nowrap">.wellnessprojectionlab.com</span>
            <button onClick={checkSubdomain} disabled={!subdomain || checkingSubdomain} className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium disabled:opacity-50">{checkingSubdomain ? '...' : 'Check'}</button>
          </div>
          {subdomainAvailable === true && <p className="mt-2 text-sm text-green-600 flex items-center gap-1"><CheckCircleIcon className="h-4 w-4" /> Available</p>}
          {subdomainAvailable === false && <p className="mt-2 text-sm text-red-600">Already taken</p>}
        </section>

        {/* Section 7: Additional */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Additional Info</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <FormField label="Expected Launch Date"><input type="date" value={launchDate} onChange={e => setLaunchDate(e.target.value)} className={inputClass} /></FormField>
            <FormField label="Lead Source">
              <select value={leadSource} onChange={e => setLeadSource(e.target.value)} className={selectClass}>
                {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Internal notes about this franchise..." className={inputClass} />
          </FormField>
        </section>

        {/* Order Summary */}
        <section className="bg-primary/5 rounded-xl border-2 border-primary p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Business</span><span className="font-medium text-foreground">{businessName || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Admin</span><span className="text-foreground">{contactName || '—'} ({email || '—'})</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Subdomain</span><span className="text-foreground">{subdomain || '—'}.wellnessprojectionlab.com</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium text-foreground">{planData.name} ({billingTerm})</span></div>
            <hr className="border-border" />
            <div className="flex justify-between"><span className="text-muted-foreground">Setup fee</span><span className="font-medium text-foreground">$3,000</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Monthly base</span><span className="font-medium text-foreground">${displayPrice}/mo</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Per seat</span><span className="font-medium text-foreground">${planData.perSeat}/user/mo</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium text-foreground capitalize">{initialStatus.replace('_', ' ')}</span></div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-4">
          <Link href="/admin/tenants" className="flex-1 text-center py-3 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80">Cancel</Link>
          <button onClick={handleCreate} disabled={saving || !businessName || !contactName || !email || !subdomain} className="flex-1 py-3 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg">
            {saving ? 'Creating...' : 'Create Franchise'}
          </button>
        </div>
      </div>
    </div>
  )
}
