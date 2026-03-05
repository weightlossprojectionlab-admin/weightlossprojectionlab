@echo off
REM Stripe Mode Switcher - Toggle between test and live Stripe keys
REM Usage: switch-stripe-mode.bat [test|live]

setlocal enabledelayedexpansion

set MODE=%1

if "%MODE%"=="" (
    echo Usage: switch-stripe-mode.bat [test^|live]
    echo.
    echo Current Stripe mode:
    findstr /C:"STRIPE_SECRET_KEY=" .env.local | findstr /C:"sk_live" >nul
    if !errorlevel!==0 (
        echo [LIVE MODE] - Using live Stripe keys
    ) else (
        echo [TEST MODE] - Using test Stripe keys
    )
    exit /b 1
)

if /i "%MODE%"=="test" (
    echo Switching to TEST mode...
    echo.
    echo ============================================
    echo WARNING: You need to add TEST keys first!
    echo ============================================
    echo.
    echo 1. Go to https://dashboard.stripe.com/test/apikeys
    echo 2. Copy your test keys
    echo 3. Add them to .env.local as:
    echo.
    echo    # TEST MODE KEYS
    echo    #STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
    echo    #NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
    echo.
    echo Then run this script again.
    exit /b 1
)

if /i "%MODE%"=="live" (
    echo Switching to LIVE mode...
    echo.
    echo ============================================
    echo WARNING: LIVE MODE - Real charges will occur!
    echo ============================================
    echo.
    echo Are you sure you want to use LIVE Stripe keys? (Y/N)
    set /p CONFIRM=
    if /i not "!CONFIRM!"=="Y" (
        echo Cancelled.
        exit /b 0
    )
    echo LIVE mode is already active in your .env.local
    exit /b 0
)

echo Invalid mode: %MODE%
echo Use 'test' or 'live'
exit /b 1
