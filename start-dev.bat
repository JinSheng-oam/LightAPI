@echo off
title LightAPI Desktop Dev
cd /d "%~dp0"

where pwsh.exe >nul 2>nul
if %ERRORLEVEL% equ 0 (
    pwsh.exe -NoLogo -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1"
    goto end
)

where powershell.exe >nul 2>nul
if %ERRORLEVEL% equ 0 (
    powershell.exe -NoLogo -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1"
    goto end
)

echo [ERROR] PowerShell not found in PATH.
pause

:end
if %ERRORLEVEL% neq 0 (
    pause
)