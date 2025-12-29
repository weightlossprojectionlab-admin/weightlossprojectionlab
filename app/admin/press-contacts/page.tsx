/**
 * Admin Dashboard for Press Contact Tracking
 * View and analyze press contact attempts from media/public
 */

'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { PressContact, PressContactStats } from '@/types/press'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import Link from 'next/link'

interface ContactWithDate extends Omit<PressContact, 'contactedAt'> {
  contactedAt: Date
}

interface StatsWithDate extends Omit<PressContactStats, 'lastContactedAt'> {
  lastContactedAt: Date
}

export default function PressContactsPage() {
  const { isAdmin, loading: authLoading } = useAdminAuth()
  const [contacts, setContacts] = useState<ContactWithDate[]>([])
  const [stats, setStats] = useState<StatsWithDate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRelease, setSelectedRelease] = useState<string>('all')

  // Fetch contact data
  useEffect(() => {
    if (!isAdmin || authLoading) return

    async function fetchContacts() {
      try {
        setLoading(true)
        setError(null)

        // Fetch recent contacts
        const contactsRef = collection(db, 'press_contacts')
        const contactsQuery = query(contactsRef, orderBy('contactedAt', 'desc'), limit(100))
        const contactsSnapshot = await getDocs(contactsQuery)

        const contactsData: ContactWithDate[] = contactsSnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            releaseId: data.releaseId,
            releaseSlug: data.releaseSlug,
            releaseTitle: data.releaseTitle,
            contactedAt: (data.contactedAt as Timestamp).toDate(),
            source: data.source,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            referrer: data.referrer,
          }
        })

        setContacts(contactsData)

        // Fetch aggregate stats
        const statsRef = collection(db, 'press_contact_stats')
        const statsQuery = query(statsRef, orderBy('totalContacts', 'desc'), limit(50))
        const statsSnapshot = await getDocs(statsQuery)

        const statsData: StatsWithDate[] = statsSnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            releaseSlug: data.releaseSlug,
            releaseTitle: data.releaseTitle,
            totalContacts: data.totalContacts,
            lastContactedAt: data.lastContactedAt
              ? (data.lastContactedAt as Timestamp).toDate()
              : new Date(),
            contactsByDay: data.contactsByDay || {},
          }
        })

        setStats(statsData)
      } catch (err) {
        console.error('Error fetching press contacts:', err)
        setError('Failed to load press contact data. Please check your permissions.')
      } finally {
        setLoading(false)
      }
    }

    fetchContacts()
  }, [isAdmin, authLoading])

  // Filter contacts by selected release
  const filteredContacts =
    selectedRelease === 'all'
      ? contacts
      : contacts.filter((c) => c.releaseSlug === selectedRelease)

  // Calculate summary metrics
  const totalContacts = contacts.length
  const uniqueReleases = new Set(contacts.map((c) => c.releaseSlug)).size
  const last24Hours = contacts.filter(
    (c) => new Date().getTime() - c.contactedAt.getTime() < 24 * 60 * 60 * 1000
  ).length

  if (authLoading || loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">You do not have permission to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-foreground">Press Contact Analytics</h1>
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Admin Dashboard
          </Link>
        </div>
        <p className="text-muted-foreground">
          Track media inquiries and contact attempts from press release pages
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-900 font-semibold mb-1">Error Loading Data</h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Contacts</h3>
            <svg
              className="w-8 h-8 text-blue-500"
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
          <p className="text-3xl font-bold text-foreground">{totalContacts.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">All-time contact attempts</p>
        </div>

        <div className="bg-card rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Unique Releases</h3>
            <svg
              className="w-8 h-8 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-3xl font-bold text-foreground">{uniqueReleases.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Press releases contacted</p>
        </div>

        <div className="bg-card rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Last 24 Hours</h3>
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-3xl font-bold text-foreground">{last24Hours.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Recent contact attempts</p>
        </div>
      </div>

      {/* Top Releases by Contact Volume */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Top Releases by Contacts</h2>
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Release Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Contacts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last Contact
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {stats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      No contact data available yet
                    </td>
                  </tr>
                ) : (
                  stats.map((stat) => (
                    <tr
                      key={stat.releaseSlug}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => setSelectedRelease(stat.releaseSlug)}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {stat.releaseTitle}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {stat.releaseSlug}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {stat.totalContacts.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {stat.lastContactedAt.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Contact Attempts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Recent Contact Attempts</h2>
          {selectedRelease !== 'all' && (
            <button
              onClick={() => setSelectedRelease('all')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filter
            </button>
          )}
        </div>
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Release
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      {selectedRelease !== 'all'
                        ? 'No contacts found for this release'
                        : 'No contact attempts yet'}
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">
                        {contact.contactedAt.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        {contact.contactedAt.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-foreground">{contact.releaseTitle}</div>
                        <div className="text-xs text-muted-foreground">{contact.releaseSlug}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            contact.source === 'release-page'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : contact.source === 'release-list'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          }`}
                        >
                          {contact.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {contact.ipAddress || 'Unknown'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
