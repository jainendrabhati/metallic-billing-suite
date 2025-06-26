@echo off
echo Cleaning old builds...
if exist "dist" rmdir /s /q "dist"
if exist "release" rmdir /s /q "release"

echo Installing Node dependencies...
npm install

echo Building React app...
npm run build

echo Setting up Python environment...
if not exist "backend\envs" (
    echo Creating Python virtual environment...
    python -m venv backend\envs
)

echo Activating virtual environment and installing Python dependencies...
call backend\envs\Scripts\activate.bat
pip install -r backend\requirements.txt
deactivate

echo Building Windows executable with Python bundled...
npx electron-builder --config electron-builder.json --win --publish=never

echo Build complete! 
echo The installer will automatically download and install Python if not present.
echo Check the 'release' folder for your .exe installer
pause