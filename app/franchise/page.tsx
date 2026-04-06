'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const PRACTICE_TYPES = [
  'Solo Nurse / Caregiver',
  'Wellness Coach',
  'Concierge Doctor',
  'Home Care Agency',
  'Patient Advocate',
  'Other',
]

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyBase: 750,
    perSeat: 35,
    maxSeats: 5,
    maxClients: 50,
    ai: 'Basic AI',
    support: 'Email support',
    popular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyBase: 1250,
    perSeat: 35,
    maxSeats: 15,
    maxClients: 200,
    ai: 'Full AI Suite',
    support: 'Priority support',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyBase: 2000,
    perSeat: 25,
    maxSeats: -1, // unlimited
    maxClients: -1,
    ai: 'Full AI Suite',
    support: 'Dedicated account manager',
    popular: false,
  },
]

export default function FranchisePage() {
  // Step 1: Business info
  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')

  // Step 2: Practice type
  const [practiceType, setPracticeType] = useState('')
  const [otherPractice, setOtherPractice] = useState('')
  const [staffCount, setStaffCount] = useState('1-5')
  const [familyCount, setFamilyCount] = useState('')

  // Step 3: Plan
  const [selectedPlan, setSelectedPlan] = useState('professional')

  // Step 4: Subdomain
  const [subdomain, setSubdomain] = useState('')
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null)
  const [checkingSubdomain, setCheckingSubdomain] = useState(false)

  // Agreements
  const [agreeFranchise, setAgreeFranchise] = useState(false)
  const [agreeBaa, setAgreeBaa] = useState(false)
  const [agreeBilling, setAgreeBilling] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Auto-generate subdomain from business name
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
    if (!businessName || !contactName || !email || !practiceType || !selectedPlan || !subdomain) {
      toast.error('Please complete all required fields')
      return
    }
    if (!agreeFranchise || !agreeBaa || !agreeBilling) {
      toast.error('Please agree to all terms')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/franchise/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          contactName,
          email,
          phone,
          website,
          practiceType: practiceType === 'Other' ? otherPractice : practiceType,
          staffCount,
          familyCount: parseInt(familyCount) || 0,
          plan: selectedPlan,
          subdomain,
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
            Thank you for your interest in partnering with Wellness Projection Lab. We'll review your application and reach out within 48 hours to get your platform set up.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Check your email at <strong>{email}</strong> for a confirmation and next steps.
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

        {/* Step 1: Business Info */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Step 1: Your Business</h2>
          <p className="text-sm text-gray-500 mb-6">Tell us about your practice.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
              <input type="text" value={businessName} onChange={e => handleBusinessNameChange(e.target.value)} placeholder="Gentle Touch Care" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Maria Rodriguez" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="maria@gentletouch.com" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website (optional)</label>
                <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://gentletouchcare.com" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Practice Type */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Step 2: Your Practice Type</h2>
          <p className="text-sm text-gray-500 mb-6">Help us customize the platform for your needs.</p>
          <div className="space-y-3 mb-6">
            {PRACTICE_TYPES.map(type => (
              <label key={type} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${practiceType === type ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="practiceType" value={type} checked={practiceType === type} onChange={() => setPracticeType(type)} className="text-purple-600 focus:ring-purple-500" />
                <span className="text-gray-900">{type}</span>
              </label>
            ))}
            {practiceType === 'Other' && (
              <input type="text" value={otherPractice} onChange={e => setOtherPractice(e.target.value)} placeholder="Describe your practice" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ml-8" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">How many staff?</label>
              <select value={staffCount} onChange={e => setStaffCount(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="1">Just me</option>
                <option value="1-5">1-5</option>
                <option value="6-15">6-15</option>
                <option value="16+">16+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">How many families do you manage?</label>
              <input type="number" value={familyCount} onChange={e => setFamilyCount(e.target.value)} placeholder="e.g. 25" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
        </section>

        {/* Step 3: Plan Selection */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Step 3: Choose Your Plan</h2>
          <p className="text-sm text-gray-500 mb-6">All plans include a $3,000 one-time setup fee.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map(plan => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative text-left p-6 rounded-xl border-2 transition-all ${
                  selectedPlan === plan.id
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                } ${plan.popular ? 'md:scale-105' : ''}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">POPULAR</span>
                )}
                <h3 className="font-bold text-lg text-gray-900 mb-1">{plan.name}</h3>
                <div className="text-2xl font-bold text-purple-700 mb-1">${plan.monthlyBase}<span className="text-sm font-normal text-gray-500">/mo</span></div>
                <div className="text-sm text-gray-500 mb-4">+${plan.perSeat}/seat/mo</div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-500" /> {plan.maxSeats === -1 ? 'Unlimited seats' : `${plan.maxSeats} seats`}</li>
                  <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-500" /> {plan.maxClients === -1 ? 'Unlimited clients' : `${plan.maxClients} clients`}</li>
                  <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-500" /> {plan.ai}</li>
                  <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-500" /> {plan.support}</li>
                  <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-500" /> White-label branding</li>
                  <li className="flex items-center gap-2"><CheckIcon className="h-4 w-4 text-green-500" /> HIPAA compliant</li>
                </ul>
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">Setup Fee: <strong>$3,000</strong> (one-time)</p>
        </section>

        {/* Step 4: Subdomain */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Step 4: Your Subdomain</h2>
          <p className="text-sm text-gray-500 mb-6">This will be your branded platform URL.</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={subdomain}
              onChange={e => { setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSubdomainAvailable(null) }}
              placeholder="gentletouch"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
            />
            <span className="text-gray-500 whitespace-nowrap">.wellnessprojectionlab.com</span>
            <button onClick={checkSubdomain} disabled={!subdomain || checkingSubdomain} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50">
              {checkingSubdomain ? 'Checking...' : 'Check'}
            </button>
          </div>
          {subdomainAvailable === true && (
            <p className="mt-2 text-sm text-green-600 flex items-center gap-1"><CheckCircleIcon className="h-4 w-4" /> Available!</p>
          )}
          {subdomainAvailable === false && (
            <p className="mt-2 text-sm text-red-600">This subdomain is already taken. Try another.</p>
          )}
        </section>

        {/* Agreements */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreeFranchise} onChange={e => setAgreeFranchise(e.target.checked)} className="mt-1 h-4 w-4 text-purple-600 rounded" />
              <span className="text-sm text-gray-700">I agree to the <a href="/franchise-agreement" className="text-purple-600 underline">Franchise Agreement</a></span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreeBaa} onChange={e => setAgreeBaa(e.target.checked)} className="mt-1 h-4 w-4 text-purple-600 rounded" />
              <span className="text-sm text-gray-700">I agree to the <a href="/baa" className="text-purple-600 underline">Business Associate Agreement (HIPAA)</a></span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreeBilling} onChange={e => setAgreeBilling(e.target.checked)} className="mt-1 h-4 w-4 text-purple-600 rounded" />
              <span className="text-sm text-gray-700">I understand the billing terms and the $3,000 setup fee</span>
            </label>
          </div>
        </section>

        {/* Submit */}
        <div className="text-center">
          <button
            onClick={handleSubmit}
            disabled={submitting || !businessName || !contactName || !email || !practiceType || !selectedPlan || !subdomain || !agreeFranchise || !agreeBaa || !agreeBilling}
            className="px-10 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-lg font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:hover:scale-100"
          >
            {submitting ? 'Submitting...' : 'Submit Application & Pay Setup Fee'}
          </button>
          <p className="text-sm text-gray-500 mt-4 max-w-md mx-auto">
            After payment, your branded platform will be live within 48 hours. We'll send you your admin login and onboarding guide.
          </p>
        </div>

        {/* FAQ */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "What's included in the platform?", a: "Vitals tracking, medication management, meal logging with AI, appointment scheduling, family sharing, caregiver coordination, AI health reports, shopping lists, and more — all branded to your practice." },
              { q: "Can I customize the branding?", a: "Yes — your logo, colors, company name, and subdomain. Your clients will see your brand, not ours." },
              { q: "What if I need more seats later?", a: "You can add seats anytime from your admin dashboard. Each additional seat is billed at your plan's per-seat rate." },
              { q: "Is there a contract?", a: "Month-to-month. No long-term commitment required. Cancel anytime with 30 days notice." },
              { q: "What about HIPAA compliance?", a: "The platform is fully HIPAA compliant. We sign a Business Associate Agreement (BAA) with every franchise partner. All data is encrypted at rest and in transit." },
            ].map(({ q, a }, i) => (
              <details key={i} className="group">
                <summary className="cursor-pointer font-medium text-gray-900 hover:text-purple-700 list-none flex items-center justify-between">
                  {q}
                  <span className="text-purple-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-2 text-sm text-gray-600 pl-0">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-8 px-4 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} Wellness Projection Lab. All rights reserved.</p>
        <p className="text-gray-500 mt-1">HIPAA Compliant | SOC 2 Type II | ISO 27001</p>
      </div>
    </main>
  )
}
