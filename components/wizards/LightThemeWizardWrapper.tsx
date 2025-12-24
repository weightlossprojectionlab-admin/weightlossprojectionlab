/**
 * LightThemeWizardWrapper
 *
 * Enforces light theme colors for wizard components regardless of app theme.
 * Wizards use white backgrounds with dark text for optimal readability.
 *
 * Why force light theme:
 * - Wizards are critical user flows (health data entry, appointments)
 * - Consistent, high-contrast presentation ensures WCAG 2.1 AA compliance
 * - Prevents dark-on-dark text readability issues in dark mode
 *
 * Usage:
 * Wrap all wizard step content in this component to ensure proper color scheme.
 */

'use client'

import { ReactNode } from 'react'

interface LightThemeWizardWrapperProps {
  children: ReactNode
}

export function LightThemeWizardWrapper({ children }: LightThemeWizardWrapperProps) {
  return (
    <div className="
      !bg-white !text-gray-900
      [&_h1]:!text-gray-900
      [&_h2]:!text-gray-900
      [&_h3]:!text-gray-900
      [&_h4]:!text-gray-900
      [&_label]:!text-gray-900
      [&_p]:!text-gray-700
      [&_span]:!text-gray-900
      [&_input]:!text-gray-900
      [&_input]:!bg-white
      [&_input]:!border-gray-300
      [&_textarea]:!text-gray-900
      [&_textarea]:!bg-white
      [&_textarea]:!border-gray-300
      [&_select]:!text-gray-900
      [&_select]:!bg-white
      [&_select]:!border-gray-300
      [&_select_option]:!text-gray-900
      [&_select_option]:!bg-white
      [&_button]:!text-gray-900
      [&_div]:!text-gray-900
      [&_li]:!text-gray-900
      [&_ul]:!text-gray-900
    ">
      {children}
    </div>
  )
}
