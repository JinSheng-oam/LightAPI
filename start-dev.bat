@echo off
title LightAPI Desktop Dev
cd /d "%~dp0"

:: 遇到历史应用进程直接强制退出
taskkill /f /im lightapi.exe >nul 2>nul

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

echo [ERROR] 未找到 PowerShell (pwsh.exe 或 powershell.exe)，请检查系统环境变量 PATH。
pause

:end
if %ERRORLEVEL% neq 0 (
    pause
)
