# ML Job Generator - Quick Start

## 5-Minute Setup

### 1. Prerequisites

- Node.js installed
- Git repository with code
- Terminal/command line

### 2. Generate Jobs (Preview)

```bash
npx tsx scripts/ml/generate-jobs-ml.ts
```

That's it! You'll see generated job postings based on your codebase.

### 3. Save to Firestore (Optional)

```bash
# Set up Firebase credentials first (see below)
npx tsx scripts/ml/generate-jobs-ml.ts --save
```

## Common Commands

```bash
# Preview jobs
npx tsx scripts/ml/generate-jobs-ml.ts

# Generate more jobs
npx tsx scripts/ml/generate-jobs-ml.ts --max 5

# Higher confidence threshold (fewer but more confident jobs)
npx tsx scripts/ml/generate-jobs-ml.ts --min-confidence 0.7

# Generate detailed reports
npx tsx scripts/ml/generate-jobs-ml.ts --report

# Save reports to file
npx tsx scripts/ml/generate-jobs-ml.ts --report --output jobs.txt

# Save to Firestore as drafts
npx tsx scripts/ml/generate-jobs-ml.ts --save

# Combine options
npx tsx scripts/ml/generate-jobs-ml.ts --max 5 --min-confidence 0.6 --report --save
```

## Understanding Output

```
ML JOB GENERATOR - Custom ML Model (NOT using OpenAI)
================================================================================

[ML Model] Starting job generation...
[ML Model] Project: C:\Users\...\weightlossprojectlab
[ML Model] Max jobs: 3, Min confidence: 40%

[ML Model] Step 1/3: Extracting features from codebase...
[ML Model] Features extracted:
Tech Stack Complexity: 45/100
Languages: TypeScript
Frameworks: React, Next.js, Tailwind CSS
Total Files: 234
Components: 67
API Routes: 42
Test Coverage: 35%
Commit Velocity: 12.3 commits/week
Active Areas: frontend, backend
Architecture Complexity: 40/100
Estimated Team Size: 5

[ML Model] Step 2/3: Classifying job roles...
3 roles identified:

  1. Full-Stack Engineer
     Confidence: 85%
     Priority: high

  2. Frontend Engineer
     Confidence: 72%
     Priority: high

  3. Backend Engineer
     Confidence: 68%
     Priority: medium

[ML Model] Step 3/3: Generating job descriptions...

[ML Model] Generation complete in 847ms
[ML Model] Generated 3 job posting(s)
```

## Firebase Setup (For --save)

If you want to save jobs to Firestore:

1. **Get Firebase credentials** from your Firebase project

2. **Set environment variables**:

```bash
# Windows
set FIREBASE_ADMIN_PROJECT_ID=your-project-id
set FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email
set FIREBASE_ADMIN_PRIVATE_KEY="your-private-key"

# macOS/Linux
export FIREBASE_ADMIN_PROJECT_ID=your-project-id
export FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email
export FIREBASE_ADMIN_PRIVATE_KEY="your-private-key"
```

3. **Or create .env file**:

```bash
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email
FIREBASE_ADMIN_PRIVATE_KEY="your-private-key"
```

## How It Works (Simple Explanation)

1. **Analyzes your code**
   - Reads package.json for tech stack
   - Counts files, components, API routes
   - Checks git commits for activity

2. **Scores job roles**
   - "Frontend Engineer" scores high if you have React, many components
   - "Backend Engineer" scores high if you have API routes, databases
   - "ML Engineer" scores high if you have AI/ML tools

3. **Generates job descriptions**
   - Uses templates with your actual tech stack
   - Creates realistic salary ranges
   - Lists responsibilities based on your code

4. **No AI API needed**
   - Everything runs locally
   - Fast (< 2 seconds)
   - Free (no API costs)

## Customizing Output

### Generate More Jobs

```bash
npx tsx scripts/ml/generate-jobs-ml.ts --max 10
```

### Stricter Filtering

```bash
# Only show jobs with 80%+ confidence
npx tsx scripts/ml/generate-jobs-ml.ts --min-confidence 0.8
```

## Example Output

```
================================================================================
JOB POSTING: Senior Full-Stack Engineer - TypeScript & React
================================================================================

CLASSIFICATION SUMMARY
--------------------------------------------------------------------------------
Role: Full-Stack Engineer
Seniority: Senior
Department: Engineering
Priority: HIGH
Confidence: 85%
Tech Stack: TypeScript, React, Next.js, Firebase
Reasoning:
  - Both frontend and backend development active
  - Full-stack development pattern detected
  - Multiple areas of development suggest full-stack needs

CODEBASE ANALYSIS
--------------------------------------------------------------------------------
Tech Stack Complexity: 45/100
Languages: TypeScript
Frameworks: React, Next.js, Tailwind CSS
Total Files: 234
Components: 67
API Routes: 42
...

JOB DETAILS
--------------------------------------------------------------------------------
Title: Senior Full-Stack Engineer - TypeScript & React
Department: Engineering
Location: Remote (US, Canada, EU)
Salary: $140K - $180K
Equity: 0.25%-0.75%
Reports To: Head of Engineering

ABOUT THE ROLE
--------------------------------------------------------------------------------
We're seeking a Senior Full-Stack Engineer who can move seamlessly between
frontend and backend. You'll work with TypeScript, React, Next.js, Firebase
across our entire stack.

Our application includes 67+ components on the frontend and 42+ API routes
on the backend. We value engineers who can see the big picture.

You'll ship complete features end-to-end, from database design to UI polish,
working across the full development lifecycle.
...
```

## Troubleshooting

### No jobs generated

- **Cause:** Codebase too small or confidence threshold too high
- **Solution:** Lower min-confidence: `--min-confidence 0.3`

### Only 1 job generated

- **Cause:** Limited tech stack or specialized codebase
- **Solution:** Increase max jobs: `--max 5`

### Validation errors

- **Cause:** Generated job missing required fields (shouldn't happen)
- **Solution:** Check output for specific errors, file bug report

### Firebase save fails

- **Cause:** Missing or invalid credentials
- **Solution:** Double-check environment variables

## Next Steps

1. **Review generated jobs** in terminal output
2. **Generate reports** with `--report --output jobs.txt`
3. **Save to Firestore** with `--save` (if needed)
4. **Edit in admin panel** at `/admin/careers`
5. **Publish** when ready

## Advanced Usage

See [README.md](./README.md) for:
- Architecture details
- Extending the ML system
- Adding new roles
- Tuning confidence thresholds
- Programmatic API usage

## Support

- **Documentation:** See README.md
- **Code:** Check `lib/ml/` directory
- **Examples:** Run with `--report` flag

---

**No external APIs • No API keys • No costs • Fast (< 2s) • Open source**
