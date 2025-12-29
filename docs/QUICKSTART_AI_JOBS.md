# Quick Start: AI Job Generation

Get your AI-powered job generation system running in 5 minutes.

## Prerequisites

- ✅ Git repository with commit history
- ✅ Node.js and npm installed
- ✅ OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- ✅ Firebase Admin credentials (already configured)

## Setup

### 1. Add OpenAI API Key

Add to your `.env.local`:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 2. Test the System

Run in preview mode (no saving):

```bash
npm run generate-jobs
```

Expected output:
```
🤖 AI Job Generator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Analyzing codebase...
   Commits to analyze: 10

🧠 Generating job postings with AI...

✅ Generated 2 job postings
```

### 3. Save to Firestore

If the output looks good, save it:

```bash
npm run generate-jobs -- --save
```

### 4. Review in Admin Panel

1. Go to `http://localhost:3000/admin/careers`
2. See your AI-generated jobs with purple AI badges
3. Click "Edit" to refine descriptions
4. Change status to "published" when ready

## Using the Admin UI

1. Navigate to `/admin/careers`
2. Click **"Generate from Codebase"** button (purple gradient)
3. Choose number of commits (default: 10)
4. Click **"Generate Jobs"**
5. Review the preview with confidence scores
6. Click **"Save All as Drafts"**

## Optional: Git Hook

Enable automatic analysis after commits:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/setup-job-generation-hook.ps1 -AutoGenerate
```

Now every commit will trigger a preview analysis.

## Example Workflow

```bash
# 1. Make some commits to your codebase
git add .
git commit -m "Add new ML recommendation feature"

# 2. Generate jobs from recent activity
npm run generate-jobs

# Output:
# ✅ Generated 1 job posting
#
# 📋 Job 1: Machine Learning Engineer - Recommendation Systems
#    Confidence: 89%
#    Rationale: Active ML/AI feature development

# 3. Save if it looks good
npm run generate-jobs -- --save
```

## What Gets Generated?

- **Job Title**: Based on actual technologies used
- **Salary Range**: Realistic US market rates
- **Description**: References actual features from commits
- **Tech Stack**: Pulled from package.json
- **Requirements**: Must-have skills from codebase
- **Success Metrics**: 30/60/90 day goals

## Common Commands

```bash
# Preview (default)
npm run generate-jobs

# Analyze more commits
npm run generate-jobs -- --count 20

# Specific commit
npm run generate-jobs -- --commit abc123

# Save to database
npm run generate-jobs -- --save

# Help
npm run generate-jobs -- --help
```

## Troubleshooting

**No jobs generated?**
- Normal if existing jobs cover current needs
- Try `--count 20` to analyze more commits
- Check that you have recent git commits

**API errors?**
- Verify `OPENAI_API_KEY` in `.env.local`
- Check OpenAI account has credits
- Ensure Firebase Admin credentials are set

**Jobs look weird?**
- They start as drafts for a reason!
- Edit in admin panel before publishing
- AI provides a starting point, not final copy

## Next Steps

- [ ] Generate your first job
- [ ] Review and edit in admin panel
- [ ] Publish to `/careers` page
- [ ] Share with your network
- [ ] Set up git hook for continuous generation

## Cost

- ~$0.10 per job using GPT-4 Turbo
- 10 jobs/month ≈ $1/month
- Free tier: 3 jobs for testing

---

**Need Help?** Check `docs/AI_JOB_GENERATION_SYSTEM.md` for full documentation.
