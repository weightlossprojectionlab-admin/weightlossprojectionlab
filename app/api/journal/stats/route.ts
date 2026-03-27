/**
 * Journal Stats API
 * GET — Trends and aggregations for wellness dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { errorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import type { JournalStats, DailyJournalData } from '@/types/journal'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '')
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(idToken)
    const userId = decoded.uid

    const { searchParams } = request.nextUrl
    const days = parseInt(searchParams.get('days') || '30', 10)

    const since = new Date()
    since.setDate(since.getDate() - days)

    const snap = await adminDb
      .collection('users').doc(userId)
      .collection('journal')
      .where('createdAt', '>=', since)
      .orderBy('createdAt', 'desc')
      .get()

    const entries = snap.docs.map(doc => doc.data())

    if (entries.length === 0) {
      const empty: JournalStats = {
        totalEntries: 0,
        currentStreak: 0,
        averageMood: 0,
        averageStress: 0,
        averageEnergy: 0,
        averageSleep: 0,
        selfCareRate: 0,
        burnoutRisk: 'low',
        dailyData: [],
      }
      return NextResponse.json(empty)
    }

    // Aggregate
    let moodSum = 0, stressSum = 0, energySum = 0, sleepSum = 0, selfCareCount = 0
    const dailyMap = new Map<string, DailyJournalData>()

    entries.forEach(e => {
      moodSum += e.mood || 0
      stressSum += e.stress || 0
      energySum += e.energy || 0
      sleepSum += e.sleepQuality || 0
      if (e.selfCare?.did) selfCareCount++

      const date = e.createdAt?.toDate?.()
        ? e.createdAt.toDate().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          mood: e.mood || 3,
          stress: e.stress || 3,
          energy: e.energy || 3,
          sleepQuality: e.sleepQuality || 3,
          didSelfCare: e.selfCare?.did || false,
        })
      }
    })

    const n = entries.length
    const avgStress = stressSum / n
    const avgEnergy = energySum / n

    // Burnout risk: high stress + low energy = high risk
    let burnoutRisk: 'low' | 'moderate' | 'high' = 'low'
    if (avgStress >= 4 && avgEnergy <= 2) burnoutRisk = 'high'
    else if (avgStress >= 3 && avgEnergy <= 3) burnoutRisk = 'moderate'

    // Current streak: count consecutive days from today backwards
    let streak = 0
    const today = new Date()
    for (let i = 0; i < days; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      if (dailyMap.has(key)) {
        streak++
      } else if (i > 0) {
        break // streak broken
      }
    }

    const stats: JournalStats = {
      totalEntries: n,
      currentStreak: streak,
      averageMood: Math.round((moodSum / n) * 10) / 10,
      averageStress: Math.round((stressSum / n) * 10) / 10,
      averageEnergy: Math.round((energySum / n) * 10) / 10,
      averageSleep: Math.round((sleepSum / n) * 10) / 10,
      selfCareRate: Math.round((selfCareCount / n) * 100),
      burnoutRisk,
      dailyData: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    }

    return NextResponse.json(stats)
  } catch (error) {
    logger.error('[API] GET /api/journal/stats error', error as Error)
    return errorResponse(error as Error, { route: '/api/journal/stats', operation: 'GET' })
  }
}
