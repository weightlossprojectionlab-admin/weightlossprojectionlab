/**
 * Hook for theme - light mode only
 * Dark mode has been removed platform-wide
 *
 * @deprecated Theme switching is no longer supported. App is light mode only.
 *
 * @example
 * ```tsx
 * const { theme } = useTheme()
 * // Always returns 'light'
 * ```
 */
export function useTheme() {
  return {
    theme: 'light' as const,
    setTheme: () => {},
    systemTheme: 'light' as const,
    resolvedTheme: 'light' as const,
  }
}
