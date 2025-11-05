'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { bloodSugarOperations, bloodPressureOperations, exerciseOperations } from '@/lib/health-vitals-operations'
import type { BloodSugarLog, BloodPressureLog, ExerciseLog } from '@/types'
import { toast } from 'react-hot-toast'
import { Spinner } from '@/components/ui/Spinner'
import {
  HeartIcon,
  BeakerIcon,
  FireIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

type TabType = 'blood-sugar' | 'blood-pressure' | 'exercise'

export default function HealthVitalsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('blood-sugar')
  const [loading, setLoading] = useState(true)

  // Blood Sugar State
  const [bloodSugarLogs, setBloodSugarLogs] = useState<BloodSugarLog[]>([])
  const [bsForm, setBsForm] = useState({
    glucoseLevel: '',
    measurementType: 'random' as BloodSugarLog['measurementType'],
    mealContext: '',
    notes: '',
    loggedAt: new Date().toISOString().slice(0, 16)
  })
  const [bsSubmitting, setBsSubmitting] = useState(false)

  // Blood Pressure State
  const [bloodPressureLogs, setBloodPressureLogs] = useState<BloodPressureLog[]>([])
  const [bpForm, setBpForm] = useState({
    systolic: '',
    diastolic: '',
    heartRate: '',
    measurementContext: 'morning' as BloodPressureLog['measurementContext'],
    notes: '',
    loggedAt: new Date().toISOString().slice(0, 16)
  })
  const [bpSubmitting, setBpSubmitting] = useState(false)

  // Exercise State
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([])
  const [exForm, setExForm] = useState({
    activityType: 'walking' as ExerciseLog['activityType'],
    duration: '',
    intensity: 'moderate' as ExerciseLog['intensity'],
    caloriesBurned: '',
    notes: '',
    loggedAt: new Date().toISOString().slice(0, 16)
  })
  const [exSubmitting, setExSubmitting] = useState(false)

  // Load logs on mount
  useEffect(() => {
    if (user) {
      loadAllLogs()
    }
  }, [user])

  const loadAllLogs = async () => {
    setLoading(true)
    try {
      const [bsLogs, bpLogs, exLogs] = await Promise.all([
        bloodSugarOperations.getUserLogs(7),
        bloodPressureOperations.getUserLogs(7),
        exerciseOperations.getUserLogs(7)
      ])
      setBloodSugarLogs(bsLogs)
      setBloodPressureLogs(bpLogs)
      setExerciseLogs(exLogs)
    } catch (error) {
      console.error('Failed to load logs:', error)
      toast.error('Failed to load health logs')
    } finally {
      setLoading(false)
    }
  }

  // Blood Sugar Handlers
  const handleBloodSugarSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const glucoseLevel = parseFloat(bsForm.glucoseLevel)
    if (!glucoseLevel || glucoseLevel < 20 || glucoseLevel > 600) {
      toast.error('Please enter a valid glucose level (20-600 mg/dL)')
      return
    }

    setBsSubmitting(true)
    try {
      await bloodSugarOperations.createLog({
        glucoseLevel,
        measurementType: bsForm.measurementType,
        mealContext: bsForm.mealContext || undefined,
        loggedAt: new Date(bsForm.loggedAt),
        dataSource: 'manual',
        notes: bsForm.notes || undefined
      })

      toast.success('Blood sugar logged successfully')
      setBsForm({
        glucoseLevel: '',
        measurementType: 'random',
        mealContext: '',
        notes: '',
        loggedAt: new Date().toISOString().slice(0, 16)
      })
      await loadAllLogs()
    } catch (error) {
      console.error('Failed to log blood sugar:', error)
      toast.error('Failed to save blood sugar log')
    } finally {
      setBsSubmitting(false)
    }
  }

  // Blood Pressure Handlers
  const handleBloodPressureSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const systolic = parseFloat(bpForm.systolic)
    const diastolic = parseFloat(bpForm.diastolic)

    if (!systolic || systolic < 50 || systolic > 250) {
      toast.error('Please enter a valid systolic pressure (50-250 mmHg)')
      return
    }
    if (!diastolic || diastolic < 30 || diastolic > 150) {
      toast.error('Please enter a valid diastolic pressure (30-150 mmHg)')
      return
    }

    setBpSubmitting(true)
    try {
      await bloodPressureOperations.createLog({
        systolic,
        diastolic,
        heartRate: bpForm.heartRate ? parseFloat(bpForm.heartRate) : undefined,
        measurementContext: bpForm.measurementContext,
        loggedAt: new Date(bpForm.loggedAt),
        dataSource: 'manual',
        notes: bpForm.notes || undefined
      })

      toast.success('Blood pressure logged successfully')
      setBpForm({
        systolic: '',
        diastolic: '',
        heartRate: '',
        measurementContext: 'morning',
        notes: '',
        loggedAt: new Date().toISOString().slice(0, 16)
      })
      await loadAllLogs()
    } catch (error) {
      console.error('Failed to log blood pressure:', error)
      toast.error('Failed to save blood pressure log')
    } finally {
      setBpSubmitting(false)
    }
  }

  // Exercise Handlers
  const handleExerciseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const duration = parseFloat(exForm.duration)
    if (!duration || duration < 1 || duration > 1440) {
      toast.error('Please enter a valid duration (1-1440 minutes)')
      return
    }

    setExSubmitting(true)
    try {
      await exerciseOperations.createLog({
        activityType: exForm.activityType,
        duration,
        intensity: exForm.intensity,
        caloriesBurned: exForm.caloriesBurned ? parseFloat(exForm.caloriesBurned) : undefined,
        loggedAt: new Date(exForm.loggedAt),
        dataSource: 'manual',
        notes: exForm.notes || undefined
      })

      toast.success('Exercise logged successfully')
      setExForm({
        activityType: 'walking',
        duration: '',
        intensity: 'moderate',
        caloriesBurned: '',
        notes: '',
        loggedAt: new Date().toISOString().slice(0, 16)
      })
      await loadAllLogs()
    } catch (error) {
      console.error('Failed to log exercise:', error)
      toast.error('Failed to save exercise log')
    } finally {
      setExSubmitting(false)
    }
  }

  // Helper functions
  const isAbnormalBloodSugar = (level: number) => level < 70 || level > 180
  const isAbnormalBloodPressure = (systolic: number, diastolic: number) =>
    systolic > 140 || systolic < 90 || diastolic > 90 || diastolic < 60

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Health Vitals</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your blood sugar, blood pressure, and exercise
          </p>
        </div>

        {/* Medical Disclaimer */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="text-yellow-900 dark:text-yellow-200">Not Medical Advice:</strong>
              <p className="text-yellow-800 dark:text-yellow-300 mt-1">
                This tool is for informational purposes only and does not replace professional medical advice,
                diagnosis, or treatment. Always consult your healthcare provider for medical guidance.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('blood-sugar')}
                className={`flex-1 py-4 px-6 text-center font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'blood-sugar'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <BeakerIcon className="h-5 w-5 inline-block mr-2" />
                Blood Sugar
              </button>
              <button
                onClick={() => setActiveTab('blood-pressure')}
                className={`flex-1 py-4 px-6 text-center font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'blood-pressure'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <HeartIcon className="h-5 w-5 inline-block mr-2" />
                Blood Pressure
              </button>
              <button
                onClick={() => setActiveTab('exercise')}
                className={`flex-1 py-4 px-6 text-center font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'exercise'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <FireIcon className="h-5 w-5 inline-block mr-2" />
                Exercise
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Blood Sugar Tab */}
            {activeTab === 'blood-sugar' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Log Blood Sugar</h2>
                <form onSubmit={handleBloodSugarSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Glucose Level (mg/dL) *
                      </label>
                      <input
                        type="number"
                        required
                        min="20"
                        max="600"
                        step="1"
                        value={bsForm.glucoseLevel}
                        onChange={(e) => setBsForm({ ...bsForm, glucoseLevel: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Measurement Type *
                      </label>
                      <select
                        required
                        value={bsForm.measurementType}
                        onChange={(e) => setBsForm({ ...bsForm, measurementType: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="fasting">Fasting</option>
                        <option value="before-meal">Before Meal</option>
                        <option value="after-meal">After Meal</option>
                        <option value="bedtime">Bedtime</option>
                        <option value="random">Random</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Meal Context
                      </label>
                      <input
                        type="text"
                        value={bsForm.mealContext}
                        onChange={(e) => setBsForm({ ...bsForm, mealContext: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g., Breakfast"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={bsForm.loggedAt}
                        onChange={(e) => setBsForm({ ...bsForm, loggedAt: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={bsForm.notes}
                      onChange={(e) => setBsForm({ ...bsForm, notes: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Any additional notes..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={bsSubmitting}
                    className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {bsSubmitting ? 'Saving...' : 'Log Blood Sugar'}
                  </button>
                </form>

                {/* Recent Logs */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5" />
                    Recent Logs
                  </h3>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : bloodSugarLogs.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No blood sugar logs yet. Add your first entry above.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {bloodSugarLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-4 rounded-lg border ${
                            isAbnormalBloodSugar(log.glucoseLevel)
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className={`text-2xl font-bold ${
                                  isAbnormalBloodSugar(log.glucoseLevel)
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-gray-900 dark:text-gray-100'
                                }`}>
                                  {log.glucoseLevel} mg/dL
                                </span>
                                {isAbnormalBloodSugar(log.glucoseLevel) && (
                                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 text-xs font-medium rounded">
                                    {log.glucoseLevel < 70 ? 'Low' : 'High'}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                <span className="capitalize">{log.measurementType.replace('-', ' ')}</span>
                                {log.mealContext && ` • ${log.mealContext}`}
                              </div>
                              {log.notes && (
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{log.notes}</p>
                              )}
                            </div>
                            <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-4 w-4" />
                                {new Date(log.loggedAt).toLocaleDateString()}
                              </div>
                              <div className="mt-1">
                                {new Date(log.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Blood Pressure Tab */}
            {activeTab === 'blood-pressure' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Log Blood Pressure</h2>
                <form onSubmit={handleBloodPressureSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Systolic (mmHg) *
                      </label>
                      <input
                        type="number"
                        required
                        min="50"
                        max="250"
                        step="1"
                        value={bpForm.systolic}
                        onChange={(e) => setBpForm({ ...bpForm, systolic: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="120"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Diastolic (mmHg) *
                      </label>
                      <input
                        type="number"
                        required
                        min="30"
                        max="150"
                        step="1"
                        value={bpForm.diastolic}
                        onChange={(e) => setBpForm({ ...bpForm, diastolic: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="80"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Heart Rate (bpm)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="220"
                        step="1"
                        value={bpForm.heartRate}
                        onChange={(e) => setBpForm({ ...bpForm, heartRate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="72"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Measurement Context *
                      </label>
                      <select
                        required
                        value={bpForm.measurementContext}
                        onChange={(e) => setBpForm({ ...bpForm, measurementContext: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                        <option value="post-exercise">Post-Exercise</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={bpForm.loggedAt}
                        onChange={(e) => setBpForm({ ...bpForm, loggedAt: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={bpForm.notes}
                      onChange={(e) => setBpForm({ ...bpForm, notes: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Any additional notes..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={bpSubmitting}
                    className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {bpSubmitting ? 'Saving...' : 'Log Blood Pressure'}
                  </button>
                </form>

                {/* Recent Logs */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5" />
                    Recent Logs
                  </h3>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : bloodPressureLogs.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No blood pressure logs yet. Add your first entry above.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {bloodPressureLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-4 rounded-lg border ${
                            isAbnormalBloodPressure(log.systolic, log.diastolic)
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className={`text-2xl font-bold ${
                                  isAbnormalBloodPressure(log.systolic, log.diastolic)
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-gray-900 dark:text-gray-100'
                                }`}>
                                  {log.systolic}/{log.diastolic}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">mmHg</span>
                                {log.heartRate && (
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    ❤️ {log.heartRate} bpm
                                  </span>
                                )}
                                {isAbnormalBloodPressure(log.systolic, log.diastolic) && (
                                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 text-xs font-medium rounded">
                                    Abnormal
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 capitalize">
                                {log.measurementContext.replace('-', ' ')}
                              </div>
                              {log.notes && (
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{log.notes}</p>
                              )}
                            </div>
                            <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-4 w-4" />
                                {new Date(log.loggedAt).toLocaleDateString()}
                              </div>
                              <div className="mt-1">
                                {new Date(log.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Exercise Tab */}
            {activeTab === 'exercise' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Log Exercise</h2>
                <form onSubmit={handleExerciseSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Activity Type *
                      </label>
                      <select
                        required
                        value={exForm.activityType}
                        onChange={(e) => setExForm({ ...exForm, activityType: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="walking">Walking</option>
                        <option value="swimming">Swimming</option>
                        <option value="cycling">Cycling</option>
                        <option value="yoga">Yoga</option>
                        <option value="strength">Strength Training</option>
                        <option value="chair-exercises">Chair Exercises</option>
                        <option value="stretching">Stretching</option>
                        <option value="water-aerobics">Water Aerobics</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Duration (minutes) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="1440"
                        step="1"
                        value={exForm.duration}
                        onChange={(e) => setExForm({ ...exForm, duration: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="30"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Intensity *
                      </label>
                      <select
                        required
                        value={exForm.intensity}
                        onChange={(e) => setExForm({ ...exForm, intensity: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="low">Low</option>
                        <option value="moderate">Moderate</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Calories Burned
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="5000"
                        step="1"
                        value={exForm.caloriesBurned}
                        onChange={(e) => setExForm({ ...exForm, caloriesBurned: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="200"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={exForm.loggedAt}
                        onChange={(e) => setExForm({ ...exForm, loggedAt: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={exForm.notes}
                      onChange={(e) => setExForm({ ...exForm, notes: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="How did it feel?"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={exSubmitting}
                    className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {exSubmitting ? 'Saving...' : 'Log Exercise'}
                  </button>
                </form>

                {/* Recent Logs */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5" />
                    Recent Logs
                  </h3>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : exerciseLogs.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No exercise logs yet. Add your first entry above.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {exerciseLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">
                                  {log.activityType.replace('-', ' ')}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  log.intensity === 'high'
                                    ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                                    : log.intensity === 'moderate'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200'
                                    : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                                }`}>
                                  {log.intensity}
                                </span>
                              </div>
                              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {log.duration} minutes
                                {log.caloriesBurned && ` • ${log.caloriesBurned} cal burned`}
                              </div>
                              {log.notes && (
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{log.notes}</p>
                              )}
                            </div>
                            <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-4 w-4" />
                                {new Date(log.loggedAt).toLocaleDateString()}
                              </div>
                              <div className="mt-1">
                                {new Date(log.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
