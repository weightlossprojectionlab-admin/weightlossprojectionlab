# Household Duties Feature - Access Guide

## 🎉 Feature Overview

The Household Duties feature allows caregivers to track and manage household responsibilities like laundry, cleaning, shopping, meal preparation, and more.

## 🔑 How to Access

### Method 1: From Family Admin Dashboard (PRIMARY METHOD - RECOMMENDED) ⭐

1. **Navigate to the Family Admin Dashboard**
   - Go to `/family-admin/dashboard`
   - This is your main family management hub

2. **Scroll to "All Management Tools" section**
   - Look for the **"Household Duties"** card with the 🏠 icon
   - It has a violet/purple background
   - Click it to access duty management

3. **Select a patient**
   - Choose which family member/patient to manage duties for
   - Click on their card to select them

4. **Manage duties**
   - Create, assign, track, and complete household duties
   - View statistics and filter by status

### Method 2: From Family Dashboard Tab

1. **Navigate to the Family Dashboard**
   - Go to `/family/dashboard`
   - Or click "Caregivers" in the main navigation

2. **Click the "🏠 Household Duties" tab**
   - Look for the tab in the navigation bar
   - It's alongside "Family Members", "Invitations", "Patient Access Matrix", and "Households"

3. **Select a patient and manage duties**

### Method 2: From Patient Profile

1. **Navigate to a patient's profile page**
   - Go to `/patients` to see your list of patients
   - Click on any patient to view their profile

2. **Click the "Household Duties" button**
   - Look for the purple/blue gradient button with a 🏠 house icon
   - It's located in the left sidebar under "Quick Actions"
   - Click it to manage household duties for that patient

### Method 3: Direct URL

Navigate directly to: `/patients/[patientId]/duties`

Replace `[patientId]` with the actual patient ID. For example:
- `/patients/abc123/duties`

## 📋 What You Can Do

### Create Duties
- Choose from **75+ predefined duty templates** across 13 categories:
  - 🧺 Laundry (washing, folding, ironing)
  - 🛒 Shopping (groceries, pharmacy, household supplies)
  - 🛏️ Bedroom Cleaning
  - 🚿 Bathroom Cleaning
  - 🍳 Kitchen Cleaning
  - 🛋️ Living Areas Cleaning
  - 🥘 Meal Preparation
  - 💊 Medication Pickup
  - 🚗 Transportation
  - 🧼 Personal Care
  - 🐕 Pet Care
  - 🌳 Yard Work
  - ✨ Custom duties

- **Or create custom duties** for unique household needs

### Assign & Schedule
- Assign duties to one or more caregivers
- Set frequency: Daily, Weekly, Biweekly, Monthly, As Needed, or Custom
- Set priority: Low, Medium, High, or Urgent
- Add estimated duration
- Create subtasks for complex duties

### Track Completion
- Mark duties as completed with one click
- Track completion history
- Add ratings, feedback, and photos
- View overdue duties
- Get reminders and notifications

### Monitor Progress
- View statistics dashboard
  - Total duties
  - Completed this week/month
  - Pending duties
  - Overdue duties
- Filter by status (All, Pending, In Progress, Completed)
- See duty details with assigned caregivers
- Track completion rates

## 🎯 Example Use Cases

### Example 1: Weekly Laundry
1. Click "Household Duties" button
2. Click "+ Add Duty"
3. Select "Laundry" category
4. Choose "Wash Laundry" template
5. Assign to caregiver
6. Set frequency to "Weekly"
7. Click "Create Duty"

### Example 2: Daily Meal Preparation
1. Navigate to duties page
2. Create new duty
3. Select "Meal Preparation" category
4. Choose "Prepare Dinner" template
5. Assign to caregiver
6. Set frequency to "Daily"
7. Add specific meal preferences in notes
8. Enable reminders at 4:00 PM
9. Save duty

### Example 3: Custom Duty (e.g., "Water Plants in Sunroom")
1. Click "+ Add Duty"
2. Select "Custom Duty" category
3. Enter name: "Water Plants in Sunroom"
4. Add description and instructions
5. Assign to family member
6. Set frequency to "Twice a week" (custom)
7. Set priority to "Medium"
8. Save duty

## 🔒 Permissions

- **Account Owners**: Can create, edit, and delete duties
- **Assigned Caregivers**: Can complete duties assigned to them
- **Family Members**: View access based on patient permissions

## 💡 Tips

1. **Use Templates**: Start with predefined templates for common tasks - they include helpful subtasks and estimated durations
2. **Set Realistic Durations**: This helps with scheduling and planning
3. **Use Subtasks**: Break complex duties into steps for easier tracking
4. **Enable Reminders**: Get notified when duties are due or overdue
5. **Add Notes**: Include special instructions or preferences
6. **Track Completion**: Encourage caregivers to mark duties complete for accurate tracking

## 🚀 Quick Start

1. Go to `/family/dashboard` (or click "Caregivers" in navigation)
2. Click the **"🏠 Household Duties"** tab
3. Select a patient from the list
4. Click **"+ Add Duty"**
5. Choose a category (or create custom)
6. Fill in details and assign caregivers
7. Click **"Create Duty"**

**Alternative:** Go to a patient profile page and click the "🏠 Household Duties" button in the sidebar.

## 📊 Dashboard Features

- **Stats Overview**: See total duties, completed tasks, pending items, and overdue duties at a glance
- **Status Filters**: Quickly filter by All, Pending, In Progress, or Completed
- **Duty Cards**: Each duty shows:
  - Name and description
  - Priority badge (color-coded)
  - Status badge
  - Assigned caregivers
  - Due date and countdown
  - Frequency
  - Estimated duration
  - Expandable subtasks

## 🔄 Recurring Duties

Duties automatically reschedule based on their frequency:
- **Daily**: Next due date = tomorrow
- **Weekly**: Next due date = 7 days from completion
- **Biweekly**: Next due date = 14 days from completion
- **Monthly**: Next due date = 1 month from completion
- **Custom**: Define your own schedule

## 🎨 UI Features

- **Color-coded priorities**:
  - 🔴 Red = Urgent
  - 🟠 Orange = High
  - 🟡 Yellow = Medium
  - 🔵 Blue = Low
- **Status indicators**:
  - 🟢 Green = Completed
  - 🔵 Blue = In Progress
  - ⚪ Gray = Pending
  - 🔴 Red = Overdue
- **Responsive design**: Works on desktop, tablet, and mobile
- **Quick actions**: Complete, Edit, Delete buttons for each duty

## 🛠️ Technical Details

### API Endpoints
- `GET /api/household-duties` - List all duties
- `POST /api/household-duties` - Create new duty
- `GET /api/household-duties/[id]` - Get specific duty
- `PATCH /api/household-duties/[id]` - Update duty
- `DELETE /api/household-duties/[id]` - Delete duty
- `POST /api/household-duties/[id]/complete` - Mark as completed
- `GET /api/household-duties/[id]/complete` - Get completion history

### Database Collections
- `household_duties` - Main duty records
- `duty_completions` - Completion history with ratings and feedback

## 🆘 Support

If you have any issues or questions:
1. Check that you have caregivers assigned to the patient
2. Verify you have proper permissions
3. Check the browser console for error messages
4. Contact support with the patient ID and error details
