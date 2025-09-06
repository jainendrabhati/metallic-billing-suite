; Custom NSIS installer script for Silvertally
; This script handles proper cleanup of backend processes and data

!macro customInit
  ; Kill any existing Python processes that might be running our backend
  nsExec::ExecToLog 'taskkill /F /IM python.exe /T'
  nsExec::ExecToLog 'taskkill /F /IM python3.exe /T'
  nsExec::ExecToLog 'taskkill /F /IM py.exe /T'
!macroend

!macro customInstall
  ; Create cleanup registry entries
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "BackendPath" "$APPDATA\${PRODUCT_FILENAME}\.silvertally-backend"
!macroend

!macro customUnInstall
  ; Kill backend processes before uninstall
  DetailPrint "Stopping Silvertally backend processes..."
  nsExec::ExecToLog 'taskkill /F /IM python.exe /T'
  nsExec::ExecToLog 'taskkill /F /IM python3.exe /T'
  nsExec::ExecToLog 'taskkill /F /IM py.exe /T'
  
  ; Wait for processes to terminate
  Sleep 2000
  
  ; Remove backend data directory
  DetailPrint "Removing backend data..."
  RMDir /r "$APPDATA\${PRODUCT_FILENAME}\.silvertally-backend"
  RMDir /r "$APPDATA\${PRODUCT_FILENAME}"
  
  ; Clean up any temporary files
  Delete "$TEMP\silvertally-*.*"
  Delete "$TEMP\python-installer.exe"
  
  DetailPrint "Cleanup completed"
!macroend

!macro customHeader
  !system "echo 'Building Silvertally with backend cleanup...'"
!macroend