<#
.SYNOPSIS
    LightAPI 桌面开发环境快速启动脚本 (PowerShell 7)
.DESCRIPTION
    自动检查 Rust、Node、pnpm 基础环境，并在需要时安装依赖后启动 Tauri 2 桌面调试工作台。
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# 切换至项目根目录
Set-Location -LiteralPath $PSScriptRoot

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "       LightAPI 桌面开发工作台启动器 (Tauri 2)        " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 Node.js
try {
    $nodeVer = (node -v).Trim()
    Write-Host "[✓] Node.js 环境: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "[×] 未检测到 Node.js，请确保已安装并在 PATH 中可用。" -ForegroundColor Red
    pause
    exit 1
}

# 2. 检查 pnpm
try {
    $pnpmVer = (pnpm -v).Trim()
    Write-Host "[✓] pnpm 工具链: v$pnpmVer" -ForegroundColor Green
} catch {
    Write-Host "[×] 未检测到 pnpm，请运行 npm install -g pnpm 进行安装。" -ForegroundColor Red
    pause
    exit 1
}

# 3. 检查 Rust / Cargo
try {
    $cargoVer = (cargo --version).Trim()
    Write-Host "[✓] Rust 编译器: $cargoVer" -ForegroundColor Green
} catch {
    Write-Host "[×] 未检测到 Rust/Cargo，请安装 Rust (https://rustup.rs)。" -ForegroundColor Red
    pause
    exit 1
}

# 4. 检查前端依赖
if (-not (Test-Path -LiteralPath "node_modules")) {
    Write-Host "[i] 首次运行，正在自动安装前端依赖 (pnpm install)..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[×] 前端依赖安装失败，请检查网络或配置。" -ForegroundColor Red
        pause
        exit 1
    }
}

Write-Host ""
Write-Host "[*] 正在启动 LightAPI 桌面应用 (pnpm tauri dev)..." -ForegroundColor Magenta
Write-Host "[*] 如需退出，可在本窗口按 Ctrl + C。" -ForegroundColor Gray
Write-Host ""

pnpm tauri dev