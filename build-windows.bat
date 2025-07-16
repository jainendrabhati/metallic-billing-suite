@echo off
setlocal

echo ===============================
echo Cleaning old builds...
echo ===============================
if exist "dist" (
    rmdir /s /q "dist"
    echo Removed dist folder.
)
if exist "release" (
    rmdir /s /q "release"
    echo Removed release folder.
)

echo ===============================
echo Installing Node dependencies...
echo ===============================
call npm install
if errorlevel 1 (
    echo ❌ Failed to install Node dependencies.
    pause
    exit /b 1
)

echo ===============================
echo Installing Electron dependencies...
echo ===============================
call npm install electron electron-builder electron-is-dev concurrently wait-on --save-dev
if errorlevel 1 (
    echo ❌ Failed to install Electron dependencies.
    pause
    exit /b 1
)

echo ===============================
echo Building React app...
echo ===============================
call npm run build
if errorlevel 1 (
    echo ❌ React build failed.
    pause
    exit /b 1
)

echo ===============================
echo Creating assets folder if not exists...
echo ===============================
if not exist "assets" (
    mkdir "assets"
    echo Created assets folder.
) else (
    echo Assets folder already exists.
)

echo ===============================
echo ⚠ Reminder: Python 3.11.0 will be auto-downloaded at runtime if not installed
echo ===============================

echo ===============================
echo Building Windows executable with Electron Builder...
echo ===============================
call npx electron-builder --config electron-builder.json --win --publish=never
if errorlevel 1 (
    echo ❌ Electron build failed.
    pause
    exit /b 1
)

echo ===============================
echo ✅ Build complete!
echo ===============================
echo Your Windows installer is in the 'release' folder.
echo Note: The app will handle Python installation automatically if needed.

pause
