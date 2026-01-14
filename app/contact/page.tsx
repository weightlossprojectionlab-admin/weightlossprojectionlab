/**
 * Contact Us Page
 * Contact form and information for reaching Weight Loss Projection Lab
 */

'use client'

import { useState } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { NameInput } from '@/components/form/NameInput'

import { getCSRFToken } from '@/lib/csrf'
export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.data.message)
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: ''
        })
      } else {
        toast.error(data.error || 'Failed to submit form')
      }
    } catch (error) {
      console.error('Contact form error:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mb-6 justify-center"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We're here to help! Choose the best way to reach us based on your needs.
          </p>
        </div>

        {/* Quick Contact Options */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Support</h3>
            <p className="text-sm text-gray-600 mb-4">
              Get help with your account or technical issues
            </p>
            <Link
              href="/support"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Visit Help Center →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Careers</h3>
            <p className="text-sm text-gray-600 mb-4">
              Interested in joining our team?
            </p>
            <Link
              href="/careers"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              View Openings →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Partnerships</h3>
            <p className="text-sm text-gray-600 mb-4">
              Explore partnership opportunities
            </p>
            <a
              href="mailto:partners@weightlossproglab.com"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              partners@wlpl.com →
            </a>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Sales</h3>
            <p className="text-sm text-gray-600 mb-4">
              Questions about pricing or enterprise plans
            </p>
            <a
              href="mailto:sales@weightlossproglab.com"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              sales@wlpl.com →
            </a>
          </div>
        </div>

        {/* Self-Service Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6 mb-12">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Looking for pricing or want to get started?
              </h3>
              <p className="text-gray-700 mb-4">
                Most users can sign up instantly with our 14-day free trial. No credit card required, full access to all features.
              </p>
              <Link
                href="/pricing"
                className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                View Pricing & Start Free Trial
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Contact Form */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Send Us a Message</h2>
            <p className="text-gray-600 mb-8">
              Fill out the form below and we'll get back to you within 24 hours.
            </p>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Name */}
              <NameInput
                value={formData.name}
                onChange={(name) => setFormData({ ...formData, name })}
                label="Full Name"
                placeholder="John Doe"
                required
                disabled={isSubmitting}
                className=""
              />

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="john@example.com"
                />
              </div>

              {/* Phone (optional) */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              {/* Subject */}
              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Subject *
                </label>
                <select
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select a topic...</option>
                  <option value="support">Technical Support</option>
                  <option value="sales">Sales Inquiry</option>
                  <option value="partnership">Partnership Opportunity</option>
                  <option value="press">Press/Media</option>
                  <option value="feedback">Feedback or Suggestion</option>
                  <option value="billing">Billing Question</option>
                  <option value="privacy">Privacy/Security Concern</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  required
                  value={formData.message}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Tell us how we can help..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                By submitting this form, you agree to our{' '}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            {/* Direct Contact */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Direct Contact Information
              </h2>

              <div className="space-y-6">
                {/* General Inquiries */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">General Inquiries</h3>
                    <a
                      href="mailto:hello@weightlossproglab.com"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      hello@weightlossproglab.com
                    </a>
                  </div>
                </div>

                {/* Support */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Customer Support</h3>
                    <a
                      href="mailto:support@weightlossproglab.com"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      support@weightlossproglab.com
                    </a>
                    <p className="text-sm text-gray-500 mt-1">Response within 24 hours</p>
                  </div>
                </div>

                {/* Sales */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Sales & Enterprise</h3>
                    <a
                      href="mailto:sales@weightlossproglab.com"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      sales@weightlossproglab.com
                    </a>
                    <p className="text-sm text-gray-500 mt-1">
                      Custom plans and volume pricing
                    </p>
                  </div>
                </div>

                {/* Privacy/Security */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Privacy & Security
                    </h3>
                    <a
                      href="mailto:privacy@weightlossproglab.com"
                      className="text-blue-600 hover:text-blue-700 block"
                    >
                      privacy@weightlossproglab.com
                    </a>
                    <a
                      href="mailto:security@weightlossproglab.com"
                      className="text-blue-600 hover:text-blue-700 block"
                    >
                      security@weightlossproglab.com
                    </a>
                  </div>
                </div>

                {/* Press */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-orange-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Press & Media</h3>
                    <a
                      href="mailto:press@weightlossproglab.com"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      press@weightlossproglab.com
                    </a>
                    <Link
                      href="/press"
                      className="text-sm text-gray-500 hover:text-gray-700 block mt-1"
                    >
                      Download Press Kit →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Office Hours */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-6">Support Hours</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Monday - Friday</span>
                  <span className="text-blue-100">9:00 AM - 6:00 PM EST</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Saturday</span>
                  <span className="text-blue-100">10:00 AM - 4:00 PM EST</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Sunday</span>
                  <span className="text-blue-100">Closed</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/20">
                <p className="text-sm text-blue-100">
                  <strong>Emergency Support:</strong> Available 24/7 for critical security
                  issues at{' '}
                  <a
                    href="mailto:security@weightlossproglab.com"
                    className="underline hover:text-white"
                  >
                    security@weightlossproglab.com
                  </a>
                </p>
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Connect With Us</h2>

              <div className="grid grid-cols-2 gap-4">
                <a
                  href="https://twitter.com/wlpl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                  <span className="font-medium text-gray-900">Twitter</span>
                </a>

                <a
                  href="https://linkedin.com/company/wlpl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-6 h-6 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  <span className="font-medium text-gray-900">LinkedIn</span>
                </a>

                <a
                  href="https://github.com/wlpl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium text-gray-900">GitHub</span>
                </a>

                <a
                  href="https://youtube.com/@wlpl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  <span className="font-medium text-gray-900">YouTube</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-lg p-10 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                How quickly will I receive a response?
              </h3>
              <p className="text-sm text-gray-600">
                Most inquiries receive a response within 24 hours during business days. Support
                tickets are typically answered within 2-4 hours. Emergency security issues are
                addressed immediately.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Do you offer phone support?
              </h3>
              <p className="text-sm text-gray-600">
                Currently, we provide support via email and our help center. Enterprise
                customers have access to dedicated phone support and a customer success manager.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                How do I get started?
              </h3>
              <p className="text-sm text-gray-600">
                Most users can start with our{' '}
                <Link href="/pricing" className="text-blue-600 hover:text-blue-700 underline">
                  14-day free trial
                </Link>
                . For organizations requiring volume pricing, custom contracts, or enterprise features, contact sales@weightlossproglab.com.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                How do I report a security issue?
              </h3>
              <p className="text-sm text-gray-600">
                Please email security@weightlossproglab.com immediately. We take security very
                seriously and have a responsible disclosure program.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Where can I find technical documentation?
              </h3>
              <p className="text-sm text-gray-600">
                Visit our{' '}
                <Link href="/docs" className="text-blue-600 hover:text-blue-700 underline">
                  Documentation Center
                </Link>{' '}
                for comprehensive guides, API docs, and tutorials.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Do you have an office I can visit?
              </h3>
              <p className="text-sm text-gray-600">
                We're a remote-first company, but we're happy to arrange virtual meetings. For
                enterprise clients, we can schedule in-person meetings as needed.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Visit our comprehensive help center for instant answers to common questions, guides,
            and tutorials.
          </p>
          <Link
            href="/support"
            className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Visit Help Center
          </Link>
        </div>
      </div>
    </div>
  )
}
