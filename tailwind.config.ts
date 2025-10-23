import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class', // Manual control via class on <html>
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: [
          'Cal Sans',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: [
          'Fira Code',
          'Consolas',
          'Monaco',
          'Courier New',
          'monospace',
        ],
      },
      fontSize: {
        // Fluid typography using clamp() for smooth scaling on narrow devices
        // Format: clamp(min, preferred, max)
        'xs': ['clamp(0.7rem, 1.5vw, 0.75rem)', { lineHeight: '1.4', letterSpacing: '0.01em' }],
        'sm': ['clamp(0.8rem, 1.75vw, 0.875rem)', { lineHeight: '1.5', letterSpacing: '0' }],
        'base': ['clamp(0.875rem, 2vw, 1rem)', { lineHeight: '1.6', letterSpacing: '0' }],
        'lg': ['clamp(1rem, 2.25vw, 1.125rem)', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
        'xl': ['clamp(1.125rem, 2.5vw, 1.25rem)', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        '2xl': ['clamp(1.25rem, 3vw, 1.5rem)', { lineHeight: '1.4', letterSpacing: '-0.02em' }],
        '3xl': ['clamp(1.5rem, 3.75vw, 1.875rem)', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        '4xl': ['clamp(1.75rem, 4.5vw, 2.25rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        '5xl': ['clamp(2rem, 6vw, 3rem)', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        '6xl': ['clamp(2.5rem, 7.5vw, 3.75rem)', { lineHeight: '1', letterSpacing: '-0.03em' }],
        '7xl': ['clamp(3rem, 9vw, 4.5rem)', { lineHeight: '1', letterSpacing: '-0.04em' }],
        '8xl': ['clamp(4rem, 12vw, 6rem)', { lineHeight: '1', letterSpacing: '-0.04em' }],
        '9xl': ['clamp(5rem, 16vw, 8rem)', { lineHeight: '1', letterSpacing: '-0.05em' }],
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      lineHeight: {
        none: '1',
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '2',
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
          light: 'hsl(var(--primary-light))',
          dark: 'hsl(var(--primary-dark))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
          hover: 'hsl(var(--secondary-hover))',
          light: 'hsl(var(--secondary-light))',
          dark: 'hsl(var(--secondary-dark))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          hover: 'hsl(var(--accent-hover))',
          light: 'hsl(var(--accent-light))',
          dark: 'hsl(var(--accent-dark))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          light: 'hsl(var(--success-light))',
          dark: 'hsl(var(--success-dark))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          light: 'hsl(var(--warning-light))',
          dark: 'hsl(var(--warning-dark))',
        },
        error: {
          DEFAULT: 'hsl(var(--error))',
          foreground: 'hsl(var(--error-foreground))',
          light: 'hsl(var(--error-light))',
          dark: 'hsl(var(--error-dark))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
          dark: 'hsl(var(--muted-dark))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config