@echo off
echo Deploying Firebase Storage Rules...
echo.
firebase deploy --only storage
echo.
echo Done!
pause
