'use client'

interface ReferralStatsCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: React.ReactNode
}

export function ReferralStatsCard({ title, value, subtitle, icon }: ReferralStatsCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-primary">{title}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
      {subtitle && (
        <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
      )}
    </div>
  )
}
