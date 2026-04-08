'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { FRANCHISE_PLANS as PLANS, FRANCHISE_PRACTICE_TYPES } from '@/lib/franchise-plans'

// Form picker uses the canonical practice types plus an "Other" branch that
// reveals a free-text input. The canonical list is the single source of truth
// in lib/franchise-plans.ts; "Other" is appended only here at the form layer.
const PRACTICE_TYPES = [...FRANCHISE_PRACTICE_TYPES, 'Other'] as const

const ENTITY_TYPES = [
  'Sole Proprietorship',
  'LLC',
  'Corporation',
  'Partnership',
  'Non-Profit',
  'Other',
]

const LEAD_SOURCES = [
  'LinkedIn',
  'Google Search',
  'Referral',
  'Social Media',
  'Conference/Event',
  'Other',
]

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      {children}
    </div>
  )
}

const inputClass = "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
const selectClass = "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"

export default function FranchisePage() {
  // Step 1: Business info
  const [businessName, setBusinessName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [entityType, setEntityType] = useState('')
  const [ein, setEin] = useState('')
  const [stateOfIncorporation, setStateOfIncorporation] = useState('')
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

  // Billing address
  const [billingSame, setBillingSame] = useState(true)
  const [billingAddress, setBillingAddress] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingState, setBillingState] = useState('')
  const [billingZip, setBillingZip] = useState('')
  const [billingContact, setBillingContact] = useState('')
  const [billingEmail, setBillingEmail] = useState('')

  // Step 2: Practice type
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

  // Step 3: Plan
  const [selectedPlan, setSelectedPlan] = useState('professional')
  const [billingTerm, setBillingTerm] = useState<'monthly' | 'annual'>('monthly')

  // Step 4: Subdomain
  const [subdomain, setSubdomain] = useState('')
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null)
  const [checkingSubdomain, setCheckingSubdomain] = useState(false)

  // Step 5: Additional
  const [launchDate, setLaunchDate] = useState('')
  const [leadSource, setLeadSource] = useState('')
  const [notes, setNotes] = useState('')

  // Agreements
  const [agreeFranchise, setAgreeFranchise] = useState(false)
  const [agreeBaa, setAgreeBaa] = useState(false)
  const [agreeBilling, setAgreeBilling] = useState(false)
  const [agreeData, setAgreeData] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value)
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setSubdomain(slug)
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

  const handleSubmit = async () => {
    if (!businessName || !contactName || !email || !practiceType || !selectedPlan || !subdomain || !address || !city || !state || !zip) {
      toast.error('Please complete all required fields')
      return
    }
    if (!agreeFranchise || !agreeBaa || !agreeBilling || !agreeData) {
      toast.error('Please agree to all terms')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/franchise/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Business
          businessName,
          legalName: legalName || businessName,
          entityType,
          ein,
          stateOfIncorporation,
          // Contact
          contactName,
          contactTitle,
          email,
          phone,
          website,
          // Address
          address,
          city,
          state,
          zip,
          // Billing
          billingSameAsAddress: billingSame,
          billingAddress: billingSame ? address : billingAddress,
          billingCity: billingSame ? city : billingCity,
          billingState: billingSame ? state : billingState,
          billingZip: billingSame ? zip : billingZip,
          billingContact: billingSame ? contactName : billingContact,
          billingEmail: billingEmail || email,
          // Practice
          practiceType: practiceType === 'Other' ? otherPractice : practiceType,
          licenseNumber,
          npiNumber,
          staffCount,
          familyCount: parseInt(familyCount) || 0,
          // Emergency
          emergencyContact: { name: emergencyName, email: emergencyEmail, phone: emergencyPhone },
          // Plan
          plan: selectedPlan,
          billingTerm,
          subdomain,
          // Additional
          expectedLaunchDate: launchDate,
          leadSource,
          notes,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      setSubmitted(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center px-4">
        <div className="max-w-lg text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Received!</h1>
          <p className="text-lg text-gray-600 mb-6">
            Thank you for your interest in partnering with Wellness Projection Lab. We'll review your application and reach out within 48 hours.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Check your email at <strong>{email}</strong> for confirmation and next steps.
          </p>
          <Link href="/" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium">
            Back to Home
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Launch Your Digital Health Practice</h1>
          <p className="text-xl text-purple-100 mb-8">
            Get the AI-powered platform that lets you manage 50 families from one dashboard.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <span className="flex items-center gap-2"><CheckIcon className="h-5 w-5 text-green-400" /> HIPAA Compliant</span>
            <span className="flex items-center gap-2"><CheckIcon className="h-5 w-5 text-green-400" /> White-Label</span>
            <span className="flex items-center gap-2"><CheckIcon className="h-5 w-5 text-green-400" /> AI-Powered</span>
            <span className="flex items-center gap-2"><CheckIcon className="h-5 w-5 text-green-400" /> Launch in 48 Hours</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

        {/* Step 1: Business & Legal Info */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Step 1: Business Information</h2>
          <p className="text-sm text-gray-500 mb-6">Legal and contact information for the franchise agreement.</p>
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

            <hr className="my-4" />
            <h3 className="text-sm font-semibold text-gray-900">Primary Contact</h3>

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

            <hr className="my-4" />
            <h3 className="text-sm font-semibold text-gray-900">Business Address</h3>

            <FormField label="Street Address" required>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, Suite 200" className={inputClass} />
            </FormField>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="City" required>
                <input type="text" value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="State" required>
                <input type="text" value={state} onChange={e => setState(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="ZIP" required>
                <input type="text" value={zip} onChange={e => setZip(e.target.value)} className={inputClass} />
              </FormField>
            </div>

            <hr className="my-4" />
            <h3 className="text-sm font-semibold text-gray-900">Billing Address</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={billingSame} onChange={e => setBillingSame(e.target.checked)} className="h-4 w-4 text-purple-600 rounded" />
              <span className="text-sm text-gray-700">Same as business address</span>
            </label>
            {!billingSame && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Billing Contact">
                    <input type="text" value={billingContact} onChange={e => setBillingContact(e.target.value)} className={inputClass} />
                  </FormField>
                  <FormField label="Billing Email">
                    <input type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} className={inputClass} />
                  </FormField>
                </div>
                <FormField label="Billing Address">
                  <input type="text" value={billingAddress} onChange={e => setBillingAddress(e.target.value)} className={inputClass} />
                </FormField>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="City">
                    <input type="text" value={billingCity} onChange={e => setBillingCity(e.target.value)} className={inputClass} />
                  </FormField>
                  <FormField label="State">
                    <input type="text" value={billingState} onChange={e => setBillingState(e.target.value)} className={inputClass} />
                  </FormField>
                  <FormField label="ZIP">
                    <input type="text" value={billingZip} onChange={e => setBillingZip(e.target.value)} className={inputClass} />
                  </FormField>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: Practice Type & Credentials */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Step 2: Practice Details</h2>
          <p className="text-sm text-gray-500 mb-6">Help us customize the platform and verify your credentials.</p>
          <div className="space-y-3 mb-6">
            {PRACTICE_TYPES.map(type => (
              <label key={type} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${practiceType === type ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="practiceType" value={type} checked={practiceType === type} onChange={() => setPracticeType(type)} className="text-purple-600" />
                <span className="text-gray-900">{type}</span>
              </label>
            ))}
            {practiceType === 'Other' && (
              <input type="text" value={otherPractice} onChange={e => setOtherPractice(e.target.value)} placeholder="Describe your practice" className={`${inputClass} ml-8`} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <FormField label="License / Certification Number">
              <input type="text" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} placeholder="RN-12345678" className={inputClass} />
            </FormField>
            <FormField label="NPI Number (if applicable)">
              <input type="text" value={npiNumber} onChange={e => setNpiNumber(e.target.value)} placeholder="1234567890" className={inputClass} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="How many staff?">
              <select value={staffCount} onChange={e => setStaffCount(e.target.value)} className={selectClass}>
                <option value="1">Just me</option>
                <option value="1-5">1-5</option>
                <option value="6-15">6-15</option>
                <option value="16+">16+</option>
              </select>
            </FormField>
            <FormField label="How many families do you manage?">
              <input type="number" value={familyCount} onChange={e => setFamilyCount(e.target.value)} placeholder="e.g. 25" className={inputClass} />
            </FormField>
          </div>

          <hr className="my-6" />
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Emergency / Secondary Contact</h3>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Name">
              <input type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Email">
              <input type="email" value={emergencyEmail} onChange={e => setEmergencyEmail(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Phone">
              <input type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} className={inputClass} />
            </FormField>
          </div>
        </section>

        {/* Step 3: Plan Selection */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Step 3: Choose Your Plan</h2>
          <p className="text-sm text-gray-500 mb-6">All plans include a $3,000 one-time setup fee.</p>

          {/* Billing term toggle */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button onClick={() => setBillingTerm('monthly')} className={`px-4 py-2 rounded-lg text-sm font-medium ${billingTerm === 'monthly' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Monthly</button>
            <button onClick={() => setBillingTerm('annual')} className={`px-4 py-2 rounded-lg text-sm font-medium ${billingTerm === 'annual' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Annual <span className="text-xs opacity-75">(Save 15%)</span></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map(plan => {
              const displayPrice = billingTerm === 'annual' ? Math.round(plan.monthlyBase * 0.85) : plan.monthlyBase
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative text-left p-6 rounded-xl border-2 transition-all ${selectedPlan === plan.id ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-gray-200 hover:border-gray-300'} ${plan.popular ? 'md:scale-105' : ''}`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">POPULAR</span>
                  )}
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{plan.name}</h3>
                  <div className="text-2xl font-bold text-purple-700 mb-1">${displayPrice}<span className="text-sm font-normal text-gray-500">/mo</span></div>
                  <div className="text-sm text-gray-500 mb-4">+${plan.perSeat}/seat/mo</div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" /> {plan.maxSeats === -1 ? 'Unlimited seats' : `${plan.maxSeats} seats`}</li>
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" /> {plan.maxClients === -1 ? 'Unlimited clients' : `${plan.maxClients} clients`}</li>
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" /> {plan.ai}</li>
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" /> {plan.support}</li>
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" /> White-label branding</li>
                    <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" /> HIPAA compliant</li>
                  </ul>
                </button>
              )
            })}
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">Setup Fee: <strong>$3,000</strong> (one-time) | Billing: <strong>{billingTerm === 'annual' ? 'Annual (15% off)' : 'Month-to-month'}</strong></p>
        </section>

        {/* Step 4: Subdomain */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Step 4: Your Subdomain</h2>
          <p className="text-sm text-gray-500 mb-6">This will be your branded platform URL.</p>
          <div className="flex items-center gap-2">
            <input type="text" value={subdomain} onChange={e => { setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSubdomainAvailable(null) }} placeholder="gentletouch" className={`flex-1 ${inputClass} text-lg`} />
            <span className="text-gray-500 whitespace-nowrap text-sm">.wellnessprojectionlab.com</span>
            <button onClick={checkSubdomain} disabled={!subdomain || checkingSubdomain} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50">{checkingSubdomain ? '...' : 'Check'}</button>
          </div>
          {subdomainAvailable === true && <p className="mt-2 text-sm text-green-600 flex items-center gap-1"><CheckCircleIcon className="h-4 w-4" /> Available!</p>}
          {subdomainAvailable === false && <p className="mt-2 text-sm text-red-600">Already taken. Try another.</p>}
        </section>

        {/* Step 5: Additional */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Step 5: Additional Information</h2>
          <p className="text-sm text-gray-500 mb-6">Optional details to help us serve you better.</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <FormField label="Expected Launch Date">
              <input type="date" value={launchDate} onChange={e => setLaunchDate(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="How did you hear about us?">
              <select value={leadSource} onChange={e => setLeadSource(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Notes / Questions">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Anything else you'd like us to know..." className={inputClass} />
          </FormField>
        </section>

        {/* Agreements */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Agreements & Terms</h2>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreeFranchise} onChange={e => setAgreeFranchise(e.target.checked)} className="mt-1 h-4 w-4 text-purple-600 rounded" />
              <span className="text-sm text-gray-700">I agree to the <a href="/franchise-agreement" className="text-purple-600 underline">Franchise Service Agreement</a>, including the month-to-month service term, 30-day cancellation policy, and intellectual property provisions.</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreeBaa} onChange={e => setAgreeBaa(e.target.checked)} className="mt-1 h-4 w-4 text-purple-600 rounded" />
              <span className="text-sm text-gray-700">I agree to the <a href="/baa" className="text-purple-600 underline">Business Associate Agreement (BAA)</a> for HIPAA compliance, including PHI handling, breach notification procedures, and data security requirements.</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreeBilling} onChange={e => setAgreeBilling(e.target.checked)} className="mt-1 h-4 w-4 text-purple-600 rounded" />
              <span className="text-sm text-gray-700">I understand and accept the billing terms: <strong>$3,000 setup fee</strong> (one-time), <strong>${PLANS.find(p => p.id === selectedPlan)?.monthlyBase}/mo base</strong> + <strong>${PLANS.find(p => p.id === selectedPlan)?.perSeat}/seat/mo</strong> per staff member.</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreeData} onChange={e => setAgreeData(e.target.checked)} className="mt-1 h-4 w-4 text-purple-600 rounded" />
              <span className="text-sm text-gray-700">I understand that client data belongs to me and my practice. WPL provides the infrastructure and will return all data upon termination per the <a href="/data-policy" className="text-purple-600 underline">Data Ownership Policy</a>.</span>
            </label>
          </div>
        </section>

        {/* Submit */}
        <div className="text-center">
          <button
            onClick={handleSubmit}
            disabled={submitting || !businessName || !contactName || !email || !practiceType || !selectedPlan || !subdomain || !address || !city || !state || !zip || !agreeFranchise || !agreeBaa || !agreeBilling || !agreeData}
            className="px-10 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-lg font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:hover:scale-100"
          >
            {submitting ? 'Submitting...' : 'Submit Application & Pay Setup Fee'}
          </button>
          <p className="text-sm text-gray-500 mt-4 max-w-md mx-auto">
            After payment, your branded platform will be live within 48 hours. We'll send your admin login and onboarding guide.
          </p>
        </div>

        {/* FAQ */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "What's included in the platform?", a: "Vitals tracking, medication management, meal logging with AI, appointment scheduling, family sharing, caregiver coordination, AI health reports, shopping lists, and more — all branded to your practice." },
              { q: "Can I customize the branding?", a: "Yes — your logo, colors, company name, and subdomain. Your clients see your brand, not ours." },
              { q: "What if I need more seats later?", a: "Add seats anytime from your admin dashboard. Each additional seat is billed at your plan's per-seat rate." },
              { q: "Is there a contract?", a: "Month-to-month by default. Annual billing available at 15% discount. Cancel anytime with 30 days notice." },
              { q: "What about HIPAA compliance?", a: "Fully HIPAA compliant. We sign a BAA with every franchise partner. All data encrypted at rest and in transit. SOC 2 Type II certified infrastructure." },
              { q: "Who owns the client data?", a: "You do. We provide the infrastructure. Upon termination, all your data is exported and returned to you within 30 days." },
              { q: "What's the SLA?", a: "99.9% uptime guarantee. If we fall below that in any calendar month, you receive a prorated credit." },
            ].map(({ q, a }, i) => (
              <details key={i} className="group">
                <summary className="cursor-pointer font-medium text-gray-900 hover:text-purple-700 list-none flex items-center justify-between">
                  {q}
                  <span className="text-purple-500 group-open:rotate-180 transition-transform">&#x25BC;</span>
                </summary>
                <p className="mt-2 text-sm text-gray-600">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <div className="bg-gray-900 text-white py-8 px-4 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} Wellness Projection Lab. All rights reserved.</p>
        <p className="text-gray-500 mt-1">HIPAA Compliant | SOC 2 Type II | ISO 27001</p>
      </div>
    </main>
  )
}
