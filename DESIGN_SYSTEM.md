# Weight Loss Project Lab - Design System

Complete design system for consistent styling across all pages.

## Table of Contents
- [Typography](#typography)
- [Colors](#colors)
- [Components](#components)
- [Layout](#layout)
- [Buttons](#buttons)
- [Forms](#forms)
- [Badges](#badges)
- [Responsive Design](#responsive-design)
- [Best Practices](#best-practices)

---

## Typography

### Font Families

```css
/* Primary UI Font */
font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif

/* Display/Hero Font */
font-family: Cal Sans, Inter, -apple-system, sans-serif

/* Code/Monospace */
font-family: Fira Code, Consolas, Monaco, monospace
```

### Headings

Use semantic HTML tags - they're already styled globally:

```tsx
<h1>Page Title</h1>          // 2xl/3xl/4xl, bold, responsive
<h2>Section Heading</h2>     // xl/2xl/3xl, semibold, responsive
<h3>Subsection</h3>          // lg/xl/2xl, medium, responsive
<h4>Card Title</h4>          // base/lg/xl, semibold, responsive
<h5>Small Heading</h5>       // sm/base/lg, semibold, responsive
<h6>Overline</h6>            // xs/sm, semibold, uppercase
```

### Body Text Utilities

```tsx
// Extra large body text
<p className="text-body-lg">Important paragraph text</p>

// Standard body text (default for <p>)
<p className="text-body">Regular paragraph text</p>

// Small body text
<p className="text-body-sm">Smaller paragraph text</p>

// Caption/helper text
<p className="text-caption">Form helper or image caption</p>

// Form labels
<label className="text-label">Email Address</label>

// Overline/category labels
<span className="text-overline">New Feature</span>

// Display/hero text
<h1 className="text-display">Welcome to Your Journey</h1>

// Monospace/code
<code className="text-mono">const foo = 'bar'</code>
```

---

## Colors

### ⚠️ CRITICAL RULES - READ THIS FIRST

**❌ NEVER use hardcoded Tailwind colors:**
- ❌ `bg-gray-50`, `bg-gray-100`, `bg-gray-200`, etc.
- ❌ `bg-blue-50`, `bg-blue-500`, `bg-indigo-600`, etc.
- ❌ `bg-red-50`, `bg-red-500`, `bg-red-600`, etc.
- ❌ `bg-green-50`, `bg-green-500`, etc.
- ❌ `text-blue-700`, `text-indigo-600`, `text-red-600`, etc.

**✅ ALWAYS use semantic design tokens:**
- ✅ `bg-primary`, `bg-error`, `bg-success`, `bg-muted`, etc.
- ✅ `text-primary`, `text-error`, `text-muted-foreground`, etc.

**Why?**
1. **Dark mode breaks** - Hardcoded colors don't adapt to theme changes
2. **Rebrand nightmare** - Changing brand colors requires editing 100+ files
3. **Accessibility fails** - Can't globally adjust contrast ratios
4. **Inconsistent UX** - Same semantic colors use different shades across pages

**If you need a color, use this decision tree:**

```
Need a color? → Ask: "What does this represent?"

├─ Success/completion → bg-success / bg-success-light
├─ Error/danger → bg-error / bg-error-light
├─ Warning/caution → bg-warning / bg-warning-light
├─ Primary action/brand → bg-primary / bg-primary-light
├─ Secondary action → bg-secondary / bg-secondary-light
├─ Trust/information → bg-accent / bg-accent-light
├─ Background → bg-background
├─ Card surface → bg-card
├─ Muted/subtle → bg-muted / bg-muted-dark
├─ Border → border-border
└─ Text → text-foreground / text-muted-foreground
```

---

### Semantic Colors

```tsx
// Primary (Green - Health & Wellness)
bg-primary text-primary-foreground
bg-primary-light text-primary-dark
hover:bg-primary-hover

// Secondary (Orange/Amber - Nutrition)
bg-secondary text-secondary-foreground
bg-secondary-light text-secondary-dark

// Accent (Blue - Trust/Activity)
bg-accent text-accent-foreground
bg-accent-light text-accent-dark

// Success (Green)
bg-success text-success-foreground
bg-success-light text-success-dark

// Warning (Amber)
bg-warning text-warning-foreground
bg-warning-light text-warning-dark

// Error (Red)
bg-error text-error-foreground
bg-error-light text-error-dark

// Muted (Gray - subtle backgrounds/text)
bg-muted text-muted-foreground
bg-muted-dark

// Base colors
bg-background text-foreground
bg-card text-card-foreground
border-border
```

### Common Color Use Cases

```tsx
// ✅ Page backgrounds
<main className="min-h-screen bg-background">

// ✅ Card backgrounds
<div className="bg-card rounded-lg p-4">

// ✅ Muted/subtle backgrounds (like light gray)
<div className="bg-muted rounded-lg p-3">

// ✅ Status indicators
<div className={biometricEnabled ? 'bg-success' : 'bg-muted'}>

// ✅ Info boxes (blue)
<div className="bg-accent-light border border-accent rounded-lg p-3">
  <p className="text-accent-dark">Info message here</p>
</div>

// ✅ Warning boxes (amber/yellow)
<div className="bg-warning-light border border-warning rounded-lg p-3">
  <p className="text-warning-dark">Warning message</p>
</div>

// ✅ Error boxes (red)
<div className="bg-error-light border-2 border-error rounded-lg p-4">
  <p className="text-error-dark">Error message</p>
</div>

// ✅ Success boxes (green)
<div className="bg-success-light border border-success rounded-lg p-3">
  <p className="text-success-dark">Success message</p>
</div>

// ✅ Toggles/switches
<div className="bg-muted ... peer-checked:bg-primary">

// ✅ Links
<Link href="/" className="text-primary hover:text-primary-hover">

// ✅ Borders
<div className="border border-border">
```

### Health-Specific Colors

```tsx
bg-health-bg              // Light background for health sections
bg-health-nutrition       // Nutrition accent
bg-health-activity        // Activity accent
bg-health-weight          // Weight tracking accent
bg-health-progress        // Progress background
```

---

## Components

### Page Headers

**Standard Header with Back Button:**
```tsx
import { PageHeader } from '@/components/ui/PageHeader'

<PageHeader
  title="Log Meal"
  backHref="/dashboard"
  backLabel="← Back"
  subtitle="Track your nutrition"
  actions={
    <button className="btn btn-primary">Save</button>
  }
/>
```

**Simple Header:**
```tsx
import { SimplePageHeader } from '@/components/ui/PageHeader'

<SimplePageHeader
  title="Dashboard"
  subtitle="Welcome back!"
/>
```

**Tabbed Header:**
```tsx
import { TabbedPageHeader } from '@/components/ui/PageHeader'

<TabbedPageHeader
  title="Settings"
  tabs={[
    { label: 'Profile', href: '/settings/profile', icon: '👤' },
    { label: 'Account', href: '/settings/account', icon: '⚙️' }
  ]}
  activeTab="Profile"
  backHref="/dashboard"
/>
```

### Cards

```tsx
// Basic card
<div className="card">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>

// Hoverable card
<div className="card-hover">
  <h3>Hover me</h3>
</div>

// Interactive/clickable card
<div className="card-interactive" onClick={handleClick}>
  <h3>Click me</h3>
</div>

// Health-specific card
<div className="health-card">
  <h3>Health Stats</h3>
</div>
```

---

## Layout

### Containers

```tsx
// Narrow container (max-w-2xl) - Reading content, forms
<div className="container-narrow">
  <h1>Focused Content</h1>
</div>

// Medium container (max-w-4xl) - Most pages
<div className="container-medium">
  <h1>Standard Page</h1>
</div>

// Wide container (max-w-7xl) - Dashboards, galleries
<div className="container-wide">
  <h1>Dashboard</h1>
</div>
```

### Sections

```tsx
// Standard section spacing
<section className="section">
  <h2>Section Title</h2>
</section>

// Small section spacing
<section className="section-sm">
  <h3>Compact Section</h3>
</section>

// Large section spacing
<section className="section-lg">
  <h2>Hero Section</h2>
</section>
```

---

## Buttons

### Button Variants

```tsx
// Primary action
<button className="btn btn-primary">Save</button>

// Secondary action
<button className="btn btn-secondary">Cancel</button>

// Accent
<button className="btn btn-accent">Learn More</button>

// Success
<button className="btn btn-success">Complete</button>

// Warning
<button className="btn btn-warning">Caution</button>

// Error/Destructive
<button className="btn btn-error">Delete</button>

// Outline
<button className="btn btn-outline">Secondary Action</button>

// Ghost
<button className="btn btn-ghost">Subtle Action</button>
```

### Button States

```tsx
// Disabled
<button className="btn btn-primary" disabled>
  Disabled
</button>

// Loading
<button className="btn btn-primary" disabled>
  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
  Loading...
</button>
```

---

## Forms

### Form Inputs

```tsx
// Text input
<input
  type="text"
  className="form-input"
  placeholder="Enter text"
/>

// Textarea
<textarea
  className="form-input resize-none"
  rows={3}
  placeholder="Enter description"
/>

// Select
<select className="form-input">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

### Form Layout

```tsx
<form className="space-y-4">
  <div>
    <label className="text-label block mb-1">
      Email Address
    </label>
    <input
      type="email"
      className="form-input"
      placeholder="you@example.com"
    />
    <p className="text-caption mt-1">
      We'll never share your email
    </p>
  </div>

  <div className="flex gap-3">
    <button type="submit" className="btn btn-primary flex-1">
      Submit
    </button>
    <button type="button" className="btn btn-outline">
      Cancel
    </button>
  </div>
</form>
```

---

## Badges

```tsx
// Primary badge
<span className="badge-primary">New</span>

// Secondary badge
<span className="badge-secondary">Beta</span>

// Success badge
<span className="badge-success">Complete</span>

// Warning badge
<span className="badge-warning">Pending</span>

// Error badge
<span className="badge-error">Failed</span>

// Neutral badge
<span className="badge-neutral">Draft</span>
```

---

## Progress Bars

```tsx
<div className="progress-bar">
  <div
    className="progress-bar-fill progress-bar-primary"
    style={{ width: '75%' }}
  />
</div>

// Success variant
<div className="progress-bar">
  <div
    className="progress-bar-fill progress-bar-success"
    style={{ width: '100%' }}
  />
</div>

// Warning variant
<div className="progress-bar">
  <div
    className="progress-bar-fill progress-bar-warning"
    style={{ width: '50%' }}
  />
</div>
```

---

## Notifications/Toasts

```tsx
// Success notification
<div className="notification notification-success">
  <p>✅ Meal logged successfully!</p>
</div>

// Warning notification
<div className="notification notification-warning">
  <p>⚠️ Please complete your profile</p>
</div>

// Error notification
<div className="notification notification-error">
  <p>❌ Failed to save changes</p>
</div>

// Info notification
<div className="notification notification-info">
  <p>ℹ️ New features available</p>
</div>
```

---

## Responsive Design

### Fluid Typography

All font sizes use `clamp()` for smooth scaling across devices from 320px to 1920px:

```css
/* Example: Base text scales from 0.875rem (14px) to 1rem (16px) */
font-size: clamp(0.875rem, 2vw, 1rem)

/* All 13 font sizes (xs through 9xl) scale proportionally */
```

**Benefits:**
- Smooth scaling on all screen sizes
- No awkward jumps at breakpoints
- Optimized for narrow devices (320px+)
- Excellent readability on all screens

### Safe Area Insets

The app supports notched devices (iPhone X+, Android with notches):

```tsx
// Automatically applied to <body>
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);

// All container classes respect safe areas
.container-narrow, .container-medium, .container-wide {
  padding-left: max(1rem, env(safe-area-inset-left));
  padding-right: max(1rem, env(safe-area-inset-right));
}
```

**What this means:**
- Content never gets cut off by device notches
- Proper spacing on all modern smartphones
- Works seamlessly in landscape and portrait

### Overflow Protection

Prevents horizontal scrolling and layout breaks on narrow devices:

```css
/* All elements respect container width */
* {
  max-width: 100%;
  overflow-wrap: break-word;
  word-wrap: break-word;
}

/* Media elements are responsive */
img, video, iframe, canvas {
  max-width: 100%;
  height: auto;
}
```

### Viewport Configuration

```tsx
// Optimized for PWA on all devices
viewport: {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // Enables safe area insets
}
```

### Testing Narrow Devices

The app is optimized for screens as narrow as **320px width**:
- iPhone SE (375px)
- Galaxy Fold (280px when folded, handles gracefully)
- Small Android devices (360px)

**Test checklist:**
- [ ] Text remains readable at all sizes
- [ ] No horizontal scrolling
- [ ] Touch targets are at least 44×44px
- [ ] Content doesn't overlap with notches
- [ ] Images scale proportionally

---

## Best Practices

### 1. Use Semantic HTML

```tsx
// ✅ GOOD - Semantic HTML with global styles
<h2>Section Title</h2>
<p>Body text here</p>

// ❌ BAD - Recreating styles with utility classes
<div className="text-xl font-semibold">Section Title</div>
<div className="text-base">Body text here</div>
```

### 2. Use Component Classes

```tsx
// ✅ GOOD - Reusable component class
<div className="card">
  <h3>Card Title</h3>
</div>

// ❌ BAD - Repeating utilities
<div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm">
  <h3>Card Title</h3>
</div>
```

### 3. Use Semantic Colors

```tsx
// ✅ GOOD - Semantic color names
<button className="btn btn-primary">Submit</button>
<div className="bg-success-light text-success-dark">Success!</div>

// ❌ BAD - Hardcoded colors
<button className="bg-green-500 text-white">Submit</button>
<div className="bg-green-100 text-green-800">Success!</div>
```

### 4. Mobile-First Responsive

All components are mobile-first and responsive by default:

```tsx
// Headings automatically scale
<h1>Responsive Title</h1>  // 2xl → 3xl → 4xl

// Use responsive utilities when needed
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Cards */}
</div>
```

### 5. Accessibility

```tsx
// Always include labels for form inputs
<label htmlFor="email" className="text-label">Email</label>
<input id="email" type="email" className="form-input" />

// Use semantic buttons with aria-labels
<button
  className="btn btn-primary"
  aria-label="Save meal entry"
>
  Save
</button>

// Minimum touch targets (44px) enforced by default
```

### 6. Consistency Checklist

When creating a new page, use:
- [ ] `<PageHeader>` or `<SimplePageHeader>` for the page header
- [ ] `container-narrow/medium/wide` for content width
- [ ] `section` for vertical spacing
- [ ] Semantic HTML tags (`<h1>`, `<p>`, etc.) for typography
- [ ] Component classes (`.card`, `.btn`, etc.) over utilities
- [ ] Semantic color variables (`bg-primary`, not `bg-green-500`)

---

## Dark Mode

All colors and components support dark mode automatically via CSS variables. No additional code needed!

```tsx
// This automatically adapts to dark mode
<div className="bg-background text-foreground">
  <h1 className="text-primary">Title</h1>
  <p className="text-muted-foreground">Subtitle</p>
</div>
```

---

## Example Page Template

```tsx
import { PageHeader } from '@/components/ui/PageHeader'

export default function ExamplePage() {
  return (
    <main className="min-h-screen bg-background">
      <PageHeader
        title="Page Title"
        backHref="/dashboard"
        subtitle="Optional subtitle"
      />

      <div className="container-medium py-6 space-y-6">
        {/* Content sections */}
        <section className="section-sm">
          <div className="card">
            <h2>Section Title</h2>
            <p className="text-body-sm">Description text</p>
          </div>
        </section>

        {/* More sections */}
      </div>
    </main>
  )
}
```

---

## Questions?

For questions or to propose new design system additions, create an issue in the repository.

**Last Updated:** January 2025
