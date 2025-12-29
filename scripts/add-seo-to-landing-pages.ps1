# PowerShell script to add SEO tags to landing pages
# Usage: .\scripts\add-seo-to-landing-pages.ps1

$pages = @(
    @{
        file = "college-students-weight-loss.html"
        title = "College Student Weight Loss - Beat the Freshman 15"
        desc = "Student-friendly weight loss. Track cafeteria meals in 30 seconds."
        name = "College Student Weight Loss"
        longDesc = "AI-powered meal tracking and weight loss app designed for college students"
    },
    @{
        file = "couples-weight-loss.html"
        title = "Couples Weight Loss - Lose Weight Together"
        desc = "Share your weight loss journey as a couple. Track meals together in 30 seconds."
        name = "Couples Weight Loss"
        longDesc = "AI-powered meal tracking and weight loss app designed for couples"
    },
    @{
        file = "high-blood-pressure-weight-loss.html"
        title = "Lower Blood Pressure Through Weight Loss"
        desc = "Reduce hypertension naturally. Track sodium intake and BP readings."
        name = "Blood Pressure Weight Loss"
        longDesc = "AI-powered meal tracking and weight loss app designed to lower blood pressure"
    },
    @{
        file = "joint-pain-weight-loss.html"
        title = "Joint Pain Relief Through Weight Loss"
        desc = "Reduce arthritis pain naturally. Track anti-inflammatory meals in 30 seconds."
        name = "Joint Pain Weight Loss"
        longDesc = "AI-powered meal tracking and weight loss app designed to reduce joint pain"
    },
    @{
        file = "prediabetes-weight-loss.html"
        title = "Prevent Diabetes Through Weight Loss"
        desc = "Reverse prediabetes naturally. Track blood sugar and meals in 30 seconds."
        name = "Prediabetes Weight Loss"
        longDesc = "AI-powered meal tracking and weight loss app designed to prevent type 2 diabetes"
    },
    @{
        file = "seniors-weight-loss.html"
        title = "Safe Weight Loss for Seniors 60+"
        desc = "Age-appropriate weight loss for older adults. Track meals in 30 seconds."
        name = "Seniors Weight Loss"
        longDesc = "AI-powered meal tracking and weight loss app designed for seniors"
    },
    @{
        file = "shift-workers-weight-loss.html"
        title = "Weight Loss for Shift Workers"
        desc = "Weight loss for irregular schedules. Track meals any time, day or night."
        name = "Shift Workers Weight Loss"
        longDesc = "AI-powered meal tracking and weight loss app designed for shift workers"
    },
    @{
        file = "single-parents-weight-loss.html"
        title = "Weight Loss for Single Parents"
        desc = "Weight loss that fits single parent life. Track meals in 30 seconds."
        name = "Single Parents Weight Loss"
        longDesc = "AI-powered meal tracking and weight loss app designed for single parents"
    },
    @{
        file = "traveling-professionals-weight-loss.html"
        title = "Weight Loss for Traveling Professionals"
        desc = "Track meals on the go. Perfect for business travelers and road warriors."
        name = "Traveling Professionals Weight Loss"
        longDesc = "AI-powered meal tracking and weight loss app designed for frequent travelers"
    },
    @{
        file = "working-professionals-weight-loss.html"
        title = "Weight Loss for Working Professionals"
        desc = "Office-friendly weight loss. Track desk lunches in 30 seconds."
        name = "Working Professionals Weight Loss"
        longDesc = "AI-powered meal tracking and weight loss app designed for busy professionals"
    },
    @{
        file = "vegan-weight-loss.html"
        title = "Vegan Weight Loss - Plant-Based Meal Tracking"
        desc = "100% plant-based meal tracking. Track vegan meals in 30 seconds."
        name = "Vegan Weight Loss"
        longDesc = "AI-powered meal tracking and weight loss app designed for vegan diets"
    },
    @{
        file = "vegetarian-weight-loss.html"
        title = "Vegetarian Weight Loss - Plant-Focused Tracking"
        desc = "Vegetarian meal tracking made easy. Track plant-based meals in 30 seconds."
        name = "Vegetarian Weight Loss"
        longDesc = "AI-powered meal tracking and weight loss app designed for vegetarians"
    },
    @{
        file = "keto-weight-loss-tracking.html"
        title = "Keto Weight Loss - Macro Tracking Made Easy"
        desc = "Track keto macros in 30 seconds. Stay in ketosis effortlessly."
        name = "Keto Weight Loss"
        longDesc = "AI-powered macro tracking and weight loss app designed for ketogenic diets"
    },
    @{
        file = "low-carb-weight-loss.html"
        title = "Low-Carb Weight Loss - Carb Counting Made Easy"
        desc = "Track carbs automatically in 30 seconds. Perfect for low-carb diets."
        name = "Low-Carb Weight Loss"
        longDesc = "AI-powered meal tracking and weight loss app designed for low-carb diets"
    },
    @{
        file = "mediterranean-diet-weight-loss.html"
        title = "Mediterranean Diet Weight Loss"
        desc = "Heart-healthy Mediterranean meal tracking in 30 seconds."
        name = "Mediterranean Diet Weight Loss"
        longDesc = "AI-powered meal tracking and weight loss app designed for Mediterranean diet"
    },
    @{
        file = "no-counting-calories-weight-loss.html"
        title = "Weight Loss Without Counting Calories"
        desc = "Lose weight without the math. Visual tracking in 30 seconds."
        name = "No Calorie Counting Weight Loss"
        longDesc = "AI-powered visual meal tracking and weight loss app with no calorie counting"
    },
    @{
        file = "quick-meal-logging.html"
        title = "Quick Meal Logging - 30 Seconds Per Meal"
        desc = "Hate tracking food? Track meals in 30 seconds with AI photo recognition."
        name = "Quick Meal Logging"
        longDesc = "AI-powered 30-second meal tracking app for people who hate food logging"
    },
    @{
        file = "visual-weight-loss-tracking.html"
        title = "Visual Weight Loss Tracking - Photo-Based Progress"
        desc = "Photo-based progress tracking. See your transformation visually."
        name = "Visual Weight Loss Tracking"
        longDesc = "AI-powered visual meal and progress tracking app"
    },
    @{
        file = "family-meal-planning-weight-loss.html"
        title = "Family Meal Planning Weight Loss"
        desc = "Coordinate family meals while losing weight. Track shared meals easily."
        name = "Family Meal Planning Weight Loss"
        longDesc = "AI-powered meal tracking and weight loss app designed for family meal planning"
    }
)

Write-Host "Adding SEO tags to landing pages..." -ForegroundColor Cyan

foreach ($page in $pages) {
    $filePath = "public\landing\$($page.file)"

    if (Test-Path $filePath) {
        Write-Host "Processing $($page.file)..." -ForegroundColor Yellow

        # This script is a reference - actual updates done via Claude Code Edit tool
        # to ensure proper string matching and replacement

        Write-Host "  ✓ Template ready for $($page.file)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ File not found: $filePath" -ForegroundColor Red
    }
}

Write-Host "`nScript template completed. Use Edit tool to apply changes." -ForegroundColor Cyan
