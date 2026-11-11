<#
.SYNOPSIS
    LightAPI 桌面开发环境快速启动脚本 (PowerShell 7)
.DESCRIPTION
    自动清理残留进程、检查环境依赖，并启动 Tauri 2 桌面调试工作台。退出时保持窗口，防止闪退。
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath $PSScriptRoot

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "       LightAPI 桌面开发工作台启动器 (Tauri 2)        " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查并清理可能残留的旧实例（防止 WebView2 或 1420 端口占用报错）
$oldProc = Get-Process -Name "lightapi" -ErrorAction SilentlyContinue
if ($oldProc) {
    Write-Host "[!] 检测到未退出的旧实例，正在自动清理..." -ForegroundColor Yellow
    $oldProc | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 300
}

# 2. 检查 Node.js
try {
    $nodeVer = (node -v).Trim()
    Write-Host "[✓] Node.js 环境: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "[×] 未检测到 Node.js，请安装 Node.js (>=20) 并配置到 PATH。" -ForegroundColor Red
    Write-Host "按任意键退出..." -ForegroundColor Gray
    [Console]::ReadKey($true) | Out-Null
    exit 1
}

# 3. 检查 pnpm
try {
    $pnpmVer = (pnpm -v).Trim()
    Write-Host "[✓] pnpm 工具链: v$pnpmVer" -ForegroundColor Green
} catch {
    Write-Host "[×] 未检测到 pnpm，请运行 npm install -g pnpm 进行安装。" -ForegroundColor Red
    Write-Host "按任意键退出..." -ForegroundColor Gray
    [Console]::ReadKey($true) | Out-Null
    exit 1
}

# 4. 检查 Rust / Cargo
try {
    $cargoVer = (cargo --version).Trim()
    Write-Host "[✓] Rust 编译器: $cargoVer" -ForegroundColor Green
} catch {
    Write-Host "[×] 未检测到 Cargo / Rust，请访问 https://rustup.rs 安装。" -ForegroundColor Red
    Write-Host "按任意键退出..." -ForegroundColor Gray
    [Console]::ReadKey($true) | Out-Null
    exit 1
}

# 5. 检查 node_modules
if (-not (Test-Path -LiteralPath "node_modules")) {
    Write-Host "[i] 首次运行，正在自动安装前端依赖 (pnpm install)..." -ForegroundColor Yellow
    pnpm install
}

Write-Host ""
Write-Host "[*] 正在启动 LightAPI 桌面应用 (pnpm tauri dev)..." -ForegroundColor Magenta
Write-Host "[*] 桌面窗口即将弹出，关闭窗口或按 Ctrl+C 可停止运行。" -ForegroundColor Gray
Write-Host ""

try {
    pnpm tauri dev
} catch {
    Write-Host "[×] 运行出错: $_" -ForegroundColor Red
} finally {
    Write-Host ""
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host "LightAPI 进程已退出。按任意键关闭此窗口..." -ForegroundColor Gray
    [Console]::ReadKey($true) | Out-Null
}