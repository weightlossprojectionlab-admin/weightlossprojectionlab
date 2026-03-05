#!/usr/bin/env node
/**
 * Press Kit Generator
 *
 * Generates and packages all press assets including:
 * - Brand logos (various formats and colors)
 * - Product screenshots
 * - Brand guidelines PDF
 * - Executive photos
 * - Company fact sheet
 * - Complete press kit ZIP
 *
 * Usage: npm run press:generate
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import archiver from 'archiver'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PUBLIC_DIR = path.join(__dirname, '..', 'public')
const PRESS_DIR = path.join(PUBLIC_DIR, 'press')

// Color scheme for WPL
const COLORS = {
  primary: '#10b981', // emerald-500
  secondary: '#059669', // emerald-600
  accent: '#6366f1', // indigo-500
  text: '#1f2937', // gray-800
}

console.log('🎨 WPL Press Kit Generator\n')

/**
 * Ensure directory exists
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`✅ Created directory: ${path.relative(PUBLIC_DIR, dir)}`)
  }
}

/**
 * Create SVG logo
 */
function createLogoSVG(color, variant = 'full') {
  const textColor = color === '#ffffff' ? '#ffffff' : COLORS.text

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient-${variant}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${COLORS.secondary};stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Icon: Health/Wellness symbol -->
  <circle cx="200" cy="120" r="60" fill="${color === 'gradient' ? 'url(#gradient-' + variant + ')' : color}" />
  <path d="M 200 140 L 200 240" stroke="${color === 'gradient' ? 'url(#gradient-' + variant + ')' : color}" stroke-width="12" stroke-linecap="round"/>
  <path d="M 160 180 L 240 180" stroke="${color === 'gradient' ? 'url(#gradient-' + variant + ')' : color}" stroke-width="12" stroke-linecap="round"/>

  <!-- Text: WPL -->
  <text x="200" y="320" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="${textColor}" text-anchor="middle">
    WPL
  </text>
  <text x="200" y="360" font-family="Arial, sans-serif" font-size="16" fill="${textColor}" text-anchor="middle">
    Wellness Projection Lab
  </text>
</svg>`
}

/**
 * Generate brand logos
 */
function generateLogos() {
  console.log('\n📊 Generating brand logos...')
  const logosDir = path.join(PRESS_DIR, 'logos')
  ensureDir(logosDir)

  const variants = [
    { name: 'full-color', color: 'gradient' },
    { name: 'white', color: '#ffffff' },
    { name: 'black', color: '#000000' },
    { name: 'grayscale', color: '#6b7280' },
  ]

  variants.forEach(({ name, color }) => {
    const svgPath = path.join(logosDir, `wlpl-logo-${name}.svg`)
    fs.writeFileSync(svgPath, createLogoSVG(color, name))
    console.log(`  ✓ Created wlpl-logo-${name}.svg`)
  })

  // Create README
  const readmePath = path.join(logosDir, 'README.md')
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, `# WPL Brand Logos

Official brand logos for Wellness Projection Lab.

## Available Formats

- \`wlpl-logo-full-color.svg\` - Primary logo (full color)
- \`wlpl-logo-white.svg\` - For dark backgrounds
- \`wlpl-logo-black.svg\` - For light backgrounds
- \`wlpl-logo-grayscale.svg\` - Grayscale version

## Usage Guidelines

1. **Minimum Size**: 120px wide minimum
2. **Clear Space**: 1/4 logo height on all sides
3. **Do Not**: Modify colors, distort, or add effects

For complete brand guidelines, see: /press/guidelines/wlpl-brand-guidelines.pdf
`)
  }

  console.log('  ✅ Logos generated')
}

/**
 * Generate fact sheet
 */
function generateFactSheet() {
  console.log('\n📄 Generating company fact sheet...')
  const factSheetDir = path.join(PRESS_DIR, 'fact-sheet')
  ensureDir(factSheetDir)

  const content = `# Wellness Projection Lab - Company Fact Sheet

## Company Overview

**Name:** Wellness Projection Lab (WPL)
**Founded:** 2024
**Industry:** Digital Health & Wellness Technology
**Website:** weightlossprojectionlab.com

## Mission

Empowering individuals and families to achieve their health goals through AI-powered wellness tracking, personalized insights, and comprehensive health management tools.

## Product Overview

Wellness Projection Lab is an all-in-one digital health platform that combines:

- **AI-Powered Meal Analysis** - WPL Vision™ technology analyzes meals from photos
- **Comprehensive Health Tracking** - Medications, vitals, appointments, and medical records
- **Family Health Management** - Multi-member profiles including pet health tracking
- **Smart Recipe Discovery** - Personalized healthy recipes with nutrition analysis
- **Fitness & Body Composition** - Weight, exercise, and fitness goal tracking
- **Kitchen Management** - Pantry inventory and smart shopping lists

## Key Features

### AI & Technology
- WPL Vision™ - Proprietary meal analysis AI
- Multi-model AI orchestration (GPT-4, Gemini, Claude)
- Real-time sync across devices
- Progressive Web App (PWA) with offline support
- Push notifications for reminders

### Health Management
- Medication tracking with refill reminders
- Vital signs monitoring (BP, glucose, heart rate, etc.)
- Appointment scheduling and provider management
- Medical document storage
- Health report generation

### Nutrition & Kitchen
- Recipe discovery and meal planning
- Nutrition tracking with USDA database integration
- Pantry inventory management
- Smart shopping lists with price tracking
- Meal prep reminders

### Family Features
- Household management for up to 10 members
- Pet health tracking
- Shared shopping lists
- Household duty assignment
- Family health reports

## Subscription Plans

- **Single User**: $9.99/month or $99/year
- **Single User Plus**: $14.99/month or $149/year
- **Family Basic**: $19.99/month or $199/year
- **Family Plus**: $29.99/month or $299/year
- **Family Premium**: $49.99/month or $499/year

## Technology Stack

- Next.js 16 (React framework)
- Firebase (Authentication, Database, Storage)
- Stripe (Payment processing)
- OpenAI GPT-4, Google Gemini, Anthropic Claude
- TypeScript, Tailwind CSS
- Progressive Web App

## Contact Information

**Press Inquiries:** press@weightlossprojectionlab.com
**General Inquiries:** support@weightlossprojectionlab.com
**Website:** https://weightlossprojectionlab.com

## Social Media

- Twitter: @WPLHealth
- LinkedIn: linkedin.com/company/wellness-projection-lab
- Instagram: @WPLWellness

---

*Last Updated: ${new Date().toLocaleDateString()}*
`

  const mdPath = path.join(factSheetDir, 'wlpl-fact-sheet.md')
  fs.writeFileSync(mdPath, content)
  console.log('  ✓ Created fact sheet (Markdown)')
  console.log('  ℹ️  Note: PDF generation requires external tools')
  console.log('     Use Markdown → PDF converter or upload to press site')
  console.log('  ✅ Fact sheet generated')
}

/**
 * Generate brand guidelines
 */
function generateBrandGuidelines() {
  console.log('\n📐 Generating brand guidelines...')
  const guidelinesDir = path.join(PRESS_DIR, 'guidelines')
  ensureDir(guidelinesDir)

  const content = `# WPL Brand Guidelines

## Brand Identity

### Mission Statement
Empowering healthier lives through intelligent wellness technology.

### Brand Values
- **Trustworthy**: Evidence-based, secure, and reliable
- **Accessible**: Easy to use for all ages and technical abilities
- **Empowering**: Putting health control in users' hands
- **Innovative**: Leveraging cutting-edge AI responsibly

## Logo Usage

### Primary Logo
Use the full-color gradient logo as the primary brand mark on light backgrounds.

### Color Variations
- **Full Color**: Primary use on white/light backgrounds
- **White**: Use on dark backgrounds (#000000 or darker)
- **Black**: Use on very light backgrounds or when color printing unavailable
- **Grayscale**: Use when full color reproduction not possible

### Clear Space
Maintain clear space equal to 1/4 of the logo height on all sides.

### Minimum Size
- Digital: 120px wide minimum
- Print: 1 inch wide minimum

### Incorrect Usage ❌
Do NOT:
- Change logo colors
- Rotate or flip the logo
- Distort or stretch
- Add drop shadows or effects
- Place on busy backgrounds without proper contrast
- Use outdated versions

## Color Palette

### Primary Colors
- **Emerald Green** - #10b981 (Primary brand color)
- **Deep Emerald** - #059669 (Secondary)
- **Indigo** - #6366f1 (Accent)

### Neutral Colors
- **Charcoal** - #1f2937 (Primary text)
- **Gray** - #6b7280 (Secondary text)
- **Light Gray** - #f3f4f6 (Backgrounds)
- **White** - #ffffff

### Semantic Colors
- **Success** - #10b981 (Green)
- **Warning** - #f59e0b (Amber)
- **Error** - #ef4444 (Red)
- **Info** - #3b82f6 (Blue)

## Typography

### Primary Font
**Sans-Serif**: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto

### Font Weights
- Regular (400) - Body text
- Medium (500) - Subheadings
- Bold (700) - Headings, emphasis
- Extra Bold (800) - Display headlines

### Type Scale
- Display: 48px / 3rem
- H1: 36px / 2.25rem
- H2: 30px / 1.875rem
- H3: 24px / 1.5rem
- Body: 16px / 1rem
- Small: 14px / 0.875rem

## Voice & Tone

### Brand Voice
- **Friendly but Professional**: Warm and approachable, not clinical
- **Clear and Concise**: No jargon, explain technical terms
- **Empowering**: Focus on user control and achievement
- **Evidence-based**: Back claims with data

### Writing Guidelines
- Use active voice
- Write for 8th grade reading level
- Avoid medical/technical jargon
- Be inclusive (all ages, backgrounds, abilities)
- Focus on benefits, not just features

## Imagery

### Photography Style
- Natural, authentic moments
- Diverse representation (age, ethnicity, body types)
- Warm, natural lighting
- Focus on real people, real food
- Active lifestyle shots

### Illustration Style
- Clean, modern line art
- Use brand colors
- Friendly and approachable
- Consistent stroke weight

## Digital Guidelines

### Website
- Responsive design for all devices
- Accessibility: WCAG 2.1 AA compliance
- Fast loading (<3 seconds)
- Clear navigation

### Social Media
- Profile picture: WPL logo (full color)
- Cover images: Brand colors with key messaging
- Post style: Mix of educational, inspirational, and product content
- Hashtags: #WPLHealth #WellnessJourney

## Contact

For questions about brand usage:
**Brand Inquiries:** brand@weightlossprojectionlab.com

---

*Version 1.0 | ${new Date().toLocaleDateString()}*
`

  const mdPath = path.join(guidelinesDir, 'wlpl-brand-guidelines.md')
  fs.writeFileSync(mdPath, content)
  console.log('  ✓ Created brand guidelines (Markdown)')
  console.log('  ✅ Brand guidelines generated')
}

/**
 * Create ZIP archive
 */
async function createZip(sourceDir, outputFile, description) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputFile)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2)
      console.log(`  ✓ Created ${path.basename(outputFile)} (${sizeMB} MB)`)
      resolve()
    })

    archive.on('error', (err) => reject(err))

    archive.pipe(output)
    archive.directory(sourceDir, false)
    archive.finalize()
  })
}

/**
 * Package press kit
 */
async function packagePressKit() {
  console.log('\n📦 Packaging press kit...')

  const pressKitDir = path.join(PRESS_DIR, 'press-kit')
  ensureDir(pressKitDir)

  try {
    // Check if archiver is available
    try {
      await import('archiver')
    } catch {
      console.log('  ⚠️  archiver package not found')
      console.log('  ℹ️  Install with: npm install archiver')
      console.log('  ℹ️  For now, manually zip the contents of public/press/')
      return
    }

    // Package logos
    await createZip(
      path.join(PRESS_DIR, 'logos'),
      path.join(PRESS_DIR, 'logos', 'wlpl-logos.zip'),
      'Brand Logos'
    )

    // Package complete press kit
    const tempKitDir = path.join(pressKitDir, 'temp')
    ensureDir(tempKitDir)

    // Copy all assets to temp directory
    const subdirs = ['logos', 'fact-sheet', 'guidelines']
    for (const subdir of subdirs) {
      const src = path.join(PRESS_DIR, subdir)
      const dest = path.join(tempKitDir, subdir)
      if (fs.existsSync(src)) {
        fs.cpSync(src, dest, { recursive: true })
      }
    }

    await createZip(
      tempKitDir,
      path.join(pressKitDir, 'wlpl-complete-press-kit.zip'),
      'Complete Press Kit'
    )

    // Clean up temp directory
    fs.rmSync(tempKitDir, { recursive: true, force: true })

    console.log('  ✅ Press kit packaged')
  } catch (error) {
    console.error('  ❌ Error packaging:', error.message)
  }
}

/**
 * Main execution
 */
async function main() {
  ensureDir(PRESS_DIR)

  generateLogos()
  generateFactSheet()
  generateBrandGuidelines()
  await packagePressKit()

  console.log('\n✅ Press kit generation complete!')
  console.log('\n📍 Assets location: public/press/')
  console.log('📍 Download endpoint: /api/press/downloads?asset=press-kit')
  console.log('\n💡 Next steps:')
  console.log('   1. Review generated assets in public/press/')
  console.log('   2. Replace placeholder logos with actual brand logos')
  console.log('   3. Add product screenshots to public/press/screenshots/')
  console.log('   4. Add executive photos to public/press/executive-photos/')
  console.log('   5. Convert Markdown files to PDF (optional)')
  console.log('   6. Run script again to regenerate ZIP packages\n')
}

main().catch(console.error)
