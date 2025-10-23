import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description: string
  icon?: string
  actionLabel?: string
  actionHref?: string
  secondaryActionLabel?: string
  secondaryActionHref?: string
}

export function EmptyState({
  title,
  description,
  icon = '📊',
  actionLabel,
  actionHref,
  secondaryActionLabel,
  secondaryActionHref
}: EmptyStateProps) {
  return (
    <div className="bg-gradient-to-r from-muted to-muted-dark border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
      <div className="text-5xl mb-3 opacity-40">{icon}</div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">{description}</p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {actionLabel && actionHref && (
            <Link href={actionHref} className="btn btn-primary">
              {actionLabel}
            </Link>
          )}
          {secondaryActionLabel && secondaryActionHref && (
            <Link href={secondaryActionHref} className="btn btn-secondary">
              {secondaryActionLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

interface PlateauDetectionEmptyProps {
  daysWithData: number
  hasWeightLogs: boolean
}

export function PlateauDetectionEmpty({ daysWithData, hasWeightLogs }: PlateauDetectionEmptyProps) {
  let description = ''

  if (daysWithData < 7) {
    description = `Plateau detection requires 7 complete days of meal tracking. You have ${daysWithData} day${daysWithData === 1 ? '' : 's'} of data. Keep logging meals to unlock insights!`
  } else {
    description = 'Continue logging meals consistently to enable plateau detection and metabolism tracking.'
  }

  return (
    <EmptyState
      title="Plateau Detection (Locked)"
      description={description}
      icon="⚖️"
      actionLabel="Log Meals"
      actionHref="/log-meal"
    />
  )
}
