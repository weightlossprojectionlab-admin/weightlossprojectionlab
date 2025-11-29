/**
 * Color Mapping Reference
 *
 * This file documents the migration from Tailwind default colors to semantic CSS variables.
 * Use this as a reference when refactoring components.
 *
 * ALWAYS use semantic tokens instead of hardcoded Tailwind colors.
 */

export const COLOR_MIGRATION_MAP = {
  /**
   * BACKGROUNDS
   * Use semantic background tokens for consistent theming
   */
  backgrounds: {
    // Main page backgrounds
    'bg-background': 'bg-background',
    'dark:bg-gray-900': '', // Remove, bg-background handles dark mode
    'dark:bg-gray-950': '', // Remove, bg-background handles dark mode

    // Card backgrounds
    'bg-card': 'bg-card',
    'bg-muted': 'bg-muted',
    'dark:bg-gray-800': '', // Remove when using bg-card
  },

  /**
   * TEXT COLORS
   * Use semantic text tokens for readability and accessibility
   */
  text: {
    // Primary text
    'text-foreground': 'text-foreground',
    'dark:text-gray-100': '', // Remove, text-foreground handles dark mode

    // Secondary/muted text
    'text-muted-foreground': 'text-muted-foreground',
    'dark:text-muted-foreground': '', // Remove, text-muted-foreground handles dark mode
  },

  /**
   * BORDERS
   * Use semantic border tokens for consistency
   */
  borders: {
    'border-border': 'border-border',
    'dark:border-gray-800': '', // Remove, border-border handles dark mode
    'dark:border-gray-700': '', // Remove, border-border handles dark mode
  },

  /**
   * SEMANTIC COLORS - PRIMARY
   * Purple is the primary brand color
   */
  primary: {
    // Backgrounds
    'bg-primary': 'bg-primary',
    'hover:bg-primary-hover': 'hover:bg-primary-hover',
    'bg-primary-light': 'bg-primary-light',
    'dark:bg-purple-900/30': 'dark:bg-primary-light', // Already dark-mode aware

    // Text
    'text-primary': 'text-primary',
    'text-primary-dark': 'text-primary-dark',
    'dark:text-purple-300': '', // Remove, text-primary handles dark mode

    // Borders
    'border-primary': 'border-primary',
    'border-purple-200': 'border-primary-light',
  },

  /**
   * SEMANTIC COLORS - SECONDARY
   * Blue is the secondary color
   */
  secondary: {
    'bg-secondary': 'bg-secondary',
    'hover:bg-secondary-hover': 'hover:bg-secondary-hover',
    'bg-secondary-light': 'bg-secondary-light',
    'text-secondary': 'text-secondary',
    'border-secondary': 'border-secondary',
  },

  /**
   * SEMANTIC COLORS - SUCCESS
   * Green for success states
   */
  success: {
    'bg-success': 'bg-success',
    'bg-success-light': 'bg-success-light',
    'text-success': 'text-success',
    'text-success-dark': 'text-success-dark',
    'border-success': 'border-success',
  },

  /**
   * SEMANTIC COLORS - WARNING
   * Yellow/Amber for warning states
   */
  warning: {
    'bg-warning': 'bg-warning',
    'bg-warning-light': 'bg-warning-light',
    'text-warning': 'text-warning',
    'text-warning-dark': 'text-warning-dark',
    'border-yellow-600': 'border-warning',
    'border-warning-light': 'border-warning-light',
  },

  /**
   * SEMANTIC COLORS - ERROR/DANGER
   * Red for error/destructive states
   */
  error: {
    'bg-error': 'bg-error',
    'bg-error-light': 'bg-error-light',
    'text-error': 'text-error',
    'text-error-dark': 'text-error-dark',
    'border-error': 'border-error',
  },

  /**
   * SEMANTIC COLORS - ACCENT
   * Indigo for accent/highlight
   */
  accent: {
    'bg-accent': 'bg-accent',
    'bg-accent-light': 'bg-accent-light',
    'text-accent': 'text-accent',
    'border-accent': 'border-accent',
  },
} as const

/**
 * Common anti-patterns to avoid
 */
export const ANTI_PATTERNS = [
  // ❌ Don't use specific gray shades directly
  'bg-gray-50',
  'bg-gray-100',
  'bg-gray-200',
  'bg-gray-800',
  'bg-gray-900',
  'text-gray-500',
  'text-gray-600',
  'border-gray-200',
  'border-gray-700',

  // ❌ Don't use hardcoded color names
  'bg-purple-600',
  'bg-blue-500',
  'bg-green-500',
  'text-purple-600',
  'text-blue-600',

  // ❌ Don't duplicate dark mode classes
  'dark:bg-gray-900',
  'dark:text-gray-100',
  'dark:bg-gray-800',
  'dark:border-gray-700',
] as const

/**
 * Correct patterns to use
 */
export const CORRECT_PATTERNS = [
  // ✅ Use semantic background tokens
  'bg-background',
  'bg-card',
  'bg-muted',

  // ✅ Use semantic text tokens
  'text-foreground',
  'text-muted-foreground',
  'text-card-foreground',

  // ✅ Use semantic border tokens
  'border-border',
  'border-input',

  // ✅ Use semantic color tokens
  'bg-primary',
  'bg-secondary',
  'bg-success',
  'bg-warning',
  'bg-error',
  'text-primary',
  'hover:bg-primary-hover',
] as const

/**
 * Chart color constants using CSS variables
 * Use these instead of hardcoded hex colors in chart components
 */
export const CHART_COLORS = {
  // Primary chart colors (from theme)
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  error: 'hsl(var(--error))',

  // Multi-series chart palette
  series: [
    'hsl(var(--primary))',      // Purple
    'hsl(var(--secondary))',    // Blue
    'hsl(var(--accent))',       // Indigo
    'hsl(var(--success))',      // Green
    'hsl(var(--warning))',      // Amber
    'hsl(var(--error))',        // Red
  ],

  // Macro colors (for nutrition charts)
  macros: {
    protein: 'hsl(var(--error))',    // Red
    carbs: 'hsl(var(--warning))',    // Amber/Yellow
    fat: 'hsl(var(--success))',      // Green
  },

  // Get theme-aware tooltip/label colors dynamically
  getTooltipColors: (isDark: boolean) => ({
    background: isDark ? 'hsl(var(--card))' : 'hsl(var(--card))',
    border: isDark ? 'hsl(var(--border))' : 'hsl(var(--border))',
    text: isDark ? 'hsl(var(--card-foreground))' : 'hsl(var(--card-foreground))',
  }),
} as const

/**
 * Usage Examples
 */
export const USAGE_EXAMPLES = {
  before: {
    button: 'bg-primary hover:bg-primary-hover text-white',
    card: 'bg-card border border-border',
    text: 'text-foreground',
  },
  after: {
    button: 'bg-primary hover:bg-primary-hover text-primary-foreground',
    card: 'bg-card border border-border',
    text: 'text-foreground',
  },
} as const
