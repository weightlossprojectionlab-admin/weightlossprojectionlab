# AI-Powered Job Generation System

## Overview

The AI Job Generation System automatically analyzes your codebase and generates realistic job postings based on actual development needs. This system demonstrates your platform's AI/ML capabilities while solving a real business need.

## How It Works

```
┌─────────────────┐
│ Git Commits     │
│ package.json    │
│ File Structure  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Codebase        │
│ Analyzer        │
│                 │
│ • Git diff      │
│ • Tech stack    │
│ • Complexity    │
│ • Patterns      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AI Generator    │
│ (GPT-4 Turbo)   │
│                 │
│ Generates:      │
│ • Job title     │
│ • Description   │
│ • Requirements  │
│ • Salary range  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Firestore       │
│ (Draft status)  │
│                 │
│ Admin reviews   │
│ and publishes   │
└─────────────────┘
```

## Key Features

- **Automatic Analysis**: Scans git commits, package.json, and file structure
- **AI-Powered Generation**: Uses GPT-4 Turbo to create realistic job descriptions
- **Duplicate Prevention**: Won't create jobs that already exist
- **Confidence Scoring**: Each job includes a confidence score (0-1)
- **Metadata Tracking**: Tracks which commits triggered each job
- **Draft Mode**: All generated jobs start as drafts for review
- **Admin UI**: Beautiful modal interface for generation
- **CLI Tool**: Command-line tool for manual generation
- **Git Hooks**: Optional post-commit hook integration

## Architecture

### Components

1. **Codebase Analyzer** (`lib/ai/job-generator.ts`)
   - Analyzes git commit history
   - Scans package.json for dependencies
   - Categorizes files by type (frontend, backend, ML, etc.)
   - Assesses project complexity
   - Identifies dominant development areas

2. **AI Job Generator** (`lib/ai/job-generator.ts`)
   - Uses existing AI orchestration infrastructure
   - Calls GPT-4 Turbo API
   - Generates realistic job postings
   - Includes salary ranges based on seniority
   - Creates success metrics and qualifications

3. **CLI Tool** (`scripts/generate-jobs.ts`)
   - Command-line interface for job generation
   - Preview mode (default)
   - Save mode (writes to Firestore)
   - Configurable commit analysis depth

4. **API Routes** (`app/api/admin/jobs/generate/route.ts`)
   - Admin-only endpoint
   - Generates jobs from codebase
   - Optional Firestore persistence

5. **Admin UI** (`components/careers/AIJobGenerationModal.tsx`)
   - Beautiful modal interface
   - Preview generated jobs before saving
   - Shows confidence scores and metadata
   - One-click save to Firestore

6. **Git Hook** (`scripts/setup-job-generation-hook.ps1`)
   - Optional post-commit hook
   - Can auto-analyze after each commit
   - Preview mode by default

## Usage

### Method 1: Admin UI (Recommended)

1. Navigate to `/admin/careers`
2. Click **"Generate from Codebase"** button
3. Choose number of commits to analyze (default: 10)
4. Click **"Generate Jobs"**
5. Review generated jobs with confidence scores
6. Click **"Save All as Drafts"** to add to Firestore
7. Edit and publish jobs from the careers management page

### Method 2: CLI Tool

```bash
# Preview mode (default)
npm run generate-jobs

# Analyze last 20 commits
npm run generate-jobs -- --count 20

# Analyze specific commit
npm run generate-jobs -- --commit abc123

# Save to Firestore directly
npm run generate-jobs -- --save
```

### Method 3: Git Hook (Optional)

```powershell
# Enable auto-generation on commit
powershell -ExecutionPolicy Bypass -File ./scripts/setup-job-generation-hook.ps1 -AutoGenerate

# Disable auto-generation
powershell -ExecutionPolicy Bypass -File ./scripts/setup-job-generation-hook.ps1 -Remove
```

## Generated Job Structure

Each generated job includes:

```typescript
{
  // Basic info
  title: "Senior Frontend Engineer - React & Next.js"
  department: "Engineering"
  salary: "$140,000 - $180,000"
  location: "Remote (US, Canada, EU)"

  // Job details
  about: "2-3 paragraphs about the role..."
  whyCritical: "Why this role is needed right now..."
  responsibilities: ["Build features...", "Optimize performance..."]
  requiredQualifications: ["5+ years React", "TypeScript expert"]
  niceToHave: ["Next.js experience", "GraphQL"]

  // Success metrics
  successMetrics: {
    month1: ["Onboarding complete", "First PR merged"]
    month2: ["First feature shipped", "Team collaboration"]
    month3: ["Independent contributions", "Technical ownership"]
  }

  // AI metadata
  isAIGenerated: true
  generationMetadata: {
    generatedFrom: "abc123d"  // Commit hash
    analyzedFiles: ["app/...", "components/..."]
    analyzedCommits: ["abc123d", "def456e"]
    confidence: 0.92
    generatedAt: "2025-12-28T..."
    techStack: ["React", "Next.js", "TypeScript"]
    model: "gpt-4-turbo"
  }
}
```

## Configuration

### Environment Variables

Required for AI generation:

```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-...

# Firebase Admin credentials (required for saving)
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...
```

### Package.json Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "generate-jobs": "tsx scripts/generate-jobs.ts"
  }
}
```

## Intelligence Features

### Duplicate Prevention
- Checks existing jobs before generating
- Won't create "React Developer" if one already exists
- Suggests updates to existing jobs instead

### Seniority Detection
- Complex ML work → Senior/Staff role
- UI tweaks → Mid-Level role
- Based on commit complexity and tech stack

### Market-Aware Salaries
- Adjusts based on role complexity
- Uses realistic US market rates
- Includes equity ranges

### Realistic Descriptions
- References actual features from commits
- No generic corporate speak
- Technical and specific

## Example Output

```
🤖 AI Job Generator

─────────────────────────────────────────────────────────

📊 Analyzing codebase...
   Commits to analyze: 10

🧠 Generating job postings with AI...

✅ Generated 2 job postings

─────────────────────────────────────────────────────────

📋 Job 1: Senior Full-Stack Engineer - Next.js & Firebase
   Department: Engineering
   Salary: $140K - $180K
   Location: Remote (US, Canada, EU)
   Confidence: 92%
   Rationale: Significant full-stack development across frontend and backend
   Tech Stack: React, Next.js, TypeScript, Firebase
   Generated from commit: abc123d
   Analyzed 10 commits

─────────────────────────────────────────────────────────

📋 Job 2: Machine Learning Engineer - AI Integration
   Department: Engineering
   Salary: $160K - $200K
   Location: Remote (US, Canada, EU)
   Confidence: 88%
   Rationale: Active ML/AI feature development
   Tech Stack: Python, Gemini AI, OpenAI, TensorFlow
   Generated from commit: abc123d
   Analyzed 10 commits

─────────────────────────────────────────────────────────

📊 Summary:
   Total jobs generated: 2
   Average confidence: 90%

   ℹ️  Preview mode - jobs not saved
   Run with --save flag to save to Firestore
```

## Admin Workflow

1. **Generate**: Click "Generate from Codebase" in admin panel
2. **Review**: See AI-generated jobs with confidence scores
3. **Save**: Click "Save All as Drafts"
4. **Edit**: Jobs appear in careers management with AI badge
5. **Refine**: Edit job descriptions, requirements, etc.
6. **Publish**: Change status to "published" to make live

## Public Display

Jobs on `/careers` show an AI badge:

```
Senior Frontend Engineer - React & Next.js  [✨ AI-Generated]
```

Tooltip: "This role was identified by analyzing our actual codebase needs"

## Benefits

1. **Credibility**: Shows you practice what you preach (AI/ML)
2. **Accuracy**: Jobs reflect actual tech stack
3. **Time Savings**: Automates job description writing
4. **Transparency**: Clear AI-generated badge
5. **Flexibility**: Full admin control and editing

## Limitations

- Requires OpenAI API key (paid)
- English-only job descriptions
- Needs git history to analyze
- Draft status requires manual review
- US-centric salary ranges

## Future Enhancements

- [ ] Support for other AI models (Gemini, Claude)
- [ ] Multi-language job descriptions
- [ ] Salary range localization
- [ ] Auto-update existing jobs
- [ ] Integration with ATS systems
- [ ] Weekly/monthly auto-generation cron

## Troubleshooting

### "OPENAI_API_KEY not configured"
Add `OPENAI_API_KEY` to your `.env.local` file.

### "Git not found"
Ensure git is installed and accessible from command line.

### "No jobs generated"
This is normal if:
- Existing jobs already cover current needs
- Recent commits are minor/maintenance work
- Try increasing `--count` parameter

### "Firebase initialization failed"
Check your Firebase Admin credentials in `.env.local`:
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

## Security Notes

- All generated jobs start as **drafts**
- Admin-only API endpoint
- No sensitive code exposed in job descriptions
- PII redaction follows existing patterns
- API keys never committed to git

## Cost Estimates

Using GPT-4 Turbo:
- ~$0.10 per job generated
- 10 jobs/month = ~$1/month
- Well within most API budgets

## Support

For issues or questions:
1. Check this documentation
2. Review `lib/ai/job-generator.ts` source code
3. Check logs in admin panel
4. Contact engineering team

---

**Last Updated**: 2025-12-28
**Version**: 1.0.0
**Status**: Production Ready
