
@echo off
echo Building React app...
npm run build

echo Building Windows executable...
npx electron-builder --config electron-builder.json --win

echo Build complete! Check the 'release' folder for your .exe installer
pause
