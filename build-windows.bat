
@echo off
echo Building React app...
npm run build

echo Building Windows executable (without code signing)...
npx electron-builder --config electron-builder.json --win --publish=never

echo Build complete! Check the 'release' folder for your .exe installer
echo Note: The .exe is unsigned, which is normal for development builds
pause
