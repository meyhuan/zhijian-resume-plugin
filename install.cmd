@echo off
setlocal
powershell.exe -NoProfile -File "%~dp0scripts\install.ps1" %*
set "INSTALL_RESULT=%ERRORLEVEL%"
if not "%INSTALL_RESULT%"=="0" echo Installation failed. Read the error above and docs\troubleshooting.md.
pause
exit /b %INSTALL_RESULT%
