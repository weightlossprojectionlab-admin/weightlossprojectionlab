'use client'

import type { JournalStats } from '@/types/journal'

interface WellnessTrendsProps {
  stats: JournalStats
}

const BURNOUT_COLORS = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export function WellnessTrends({ stats }: WellnessTrendsProps) {
  if (stats.totalEntries === 0) return null

  const maxVal = 5

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Wellness Trends</h2>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${BURNOUT_COLORS[stats.burnoutRisk]}`}>
          {stats.burnoutRisk === 'high' ? 'Burnout Risk: High' :
           stats.burnoutRisk === 'moderate' ? 'Burnout Risk: Moderate' :
           'Burnout Risk: Low'}
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Entries" value={String(stats.totalEntries)} />
        <StatBox label="Streak" value={`${stats.currentStreak}d`} />
        <StatBox label="Self-care" value={`${stats.selfCareRate}%`} />
        <StatBox label="Avg Mood" value={stats.averageMood.toFixed(1)} />
      </div>

      {/* Mini bar chart for averages */}
      <div className="space-y-3">
        <BarRow label="Mood" value={stats.averageMood} max={maxVal} color="bg-green-500" />
        <BarRow label="Stress" value={stats.averageStress} max={maxVal} color="bg-red-400" inverted />
        <BarRow label="Energy" value={stats.averageEnergy} max={maxVal} color="bg-blue-500" />
        <BarRow label="Sleep" value={stats.averageSleep} max={maxVal} color="bg-purple-500" />
      </div>

      {/* Sparkline trend (simple CSS) */}
      {stats.dailyData.length > 1 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Last {stats.dailyData.length} days</h3>
          <div className="flex items-end gap-1 h-16">
            {stats.dailyData.map((day, i) => (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-0.5"
                title={`${day.date}: Mood ${day.mood}, Stress ${day.stress}`}
              >
                <div
                  className="w-full bg-green-400 rounded-t-sm transition-all"
                  style={{ height: `${(day.mood / 5) * 100}%` }}
                />
                <div
                  className="w-full bg-red-300 rounded-b-sm transition-all"
                  style={{ height: `${(day.stress / 5) * 50}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{stats.dailyData[0]?.date.slice(5)}</span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-sm" /> Mood</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-300 rounded-sm" /> Stress</span>
            </span>
            <span>{stats.dailyData[stats.dailyData.length - 1]?.date.slice(5)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background rounded-lg p-3 text-center">
      <div className="text-xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function BarRow({ label, value, max, color, inverted }: {
  label: string; value: number; max: number; color: string; inverted?: boolean
}) {
  const pct = (value / max) * 100
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-12">{label}</span>
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium w-8 text-right ${
        inverted
          ? value >= 4 ? 'text-red-500' : value >= 3 ? 'text-yellow-500' : 'text-green-500'
          : value <= 2 ? 'text-red-500' : value <= 3 ? 'text-yellow-500' : 'text-green-500'
      }`}>
        {value.toFixed(1)}
      </span>
    </div>
  )
}
