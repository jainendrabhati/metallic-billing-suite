@echo off
echo Cleaning old builds...
if exist "dist" rmdir /s /q "dist"
if exist "release" rmdir /s /q "release"

echo Installing dependencies...
npm install

echo Building React app...
npm run build

echo Building Windows executable...
npx electron-builder --config electron-builder.json --win --publish=never

echo Build complete! Check the 'release' folder for your .exe installer
echo Note: The .exe is unsigned, which is normal for development builds
pause