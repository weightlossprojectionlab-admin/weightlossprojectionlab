@echo off
echo ========================================
echo  Firebase Deployment Script
echo ========================================
echo.

echo Step 1: Checking Firebase CLI...
firebase --version
if %errorlevel% neq 0 (
    echo ERROR: Firebase CLI not found!
    echo Please install: npm install -g firebase-tools
    pause
    exit /b 1
)
echo.

echo Step 2: Deploying Firestore Rules...
firebase deploy --only firestore:rules
if %errorlevel% neq 0 (
    echo ERROR: Rules deployment failed!
    pause
    exit /b 1
)
echo.

echo Step 3: Deploying Firestore Indexes...
firebase deploy --only firestore:indexes
if %errorlevel% neq 0 (
    echo WARNING: Some indexes may have failed
    echo This is normal if indexes already exist
)
echo.

echo ========================================
echo  Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Wait 5-15 minutes for indexes to build
echo 2. Run tests in DEPLOYMENT_GUIDE.md
echo 3. Monitor Firestore console
echo.
pause
