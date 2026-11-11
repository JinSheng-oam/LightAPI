@echo off
chcp 936 >nul
cd /d "%~dp0"

echo ====================================================
echo        LightAPI 桌面端快速启动脚本 (双击运行)
echo ====================================================
echo.

:: 1. 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 Node.js，请确保已安装并在系统 PATH 中。
    pause
    exit /b 1
)

:: 2. 检查 pnpm
where pnpm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 pnpm，请运行 npm install -g pnpm 进行安装。
    pause
    exit /b 1
)

:: 3. 检查 Rust / Cargo
where cargo >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 Cargo / Rust，请访问 https://rustup.rs 安装。
    pause
    exit /b 1
)

:: 4. 检查 node_modules
if not exist "node_modules\" (
    echo [提示] 首次运行，正在自动安装前端依赖 (pnpm install)...
    call pnpm install
    if %ERRORLEVEL% neq 0 (
        echo [错误] 前端依赖安装失败。
        pause
        exit /b 1
    )
)

echo.
echo [*] 正在启动 LightAPI 桌面工作台 (pnpm tauri dev)...
echo [*] 关闭此窗口或在窗口中按 Ctrl+C 可停止运行。
echo.

call pnpm tauri dev
if %ERRORLEVEL% neq 0 (
    echo.
    echo [提示] LightAPI 异常退出或未能正常启动。
    pause
)