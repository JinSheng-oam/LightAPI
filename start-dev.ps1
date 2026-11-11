<#
.SYNOPSIS
    LightAPI 桌面开发环境快速启动脚本 (PowerShell 7)
.DESCRIPTION
    自动退出历史进程、释放端口、检查环境依赖，并启动 Tauri 2 桌面调试工作台。退出时保持窗口，防止闪退。
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'
if ($PSScriptRoot) {
    Set-Location -LiteralPath $PSScriptRoot
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "       LightAPI 桌面开发工作台启动器 (Tauri 2)        " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查并完全退出历史进程与残留端口（防止文件占用与端口冲突）
function Stop-HistoricalProcesses {
    $foundHistory = $false

    # (1) 清理残留的 LightAPI 进程
    $oldProcs = Get-Process -Name "lightapi" -ErrorAction SilentlyContinue
    if ($oldProcs) {
        $foundHistory = $true
        $pidList = ($oldProcs | ForEach-Object { $_.Id }) -join ', '
        Write-Host "[!] 检测到运行中的 LightAPI 历史进程 (PID: $pidList)，正在强制退出..." -ForegroundColor Yellow
        foreach ($proc in $oldProcs) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            } catch {}
        }

        # 循环等待确保进程完全结束、释放 target\debug\lightapi.exe 句柄
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        while ((Get-Process -Name "lightapi" -ErrorAction SilentlyContinue) -and ($sw.ElapsedMilliseconds -lt 3000)) {
            Start-Sleep -Milliseconds 150
        }
        Write-Host "[✓] 历史进程已完全退出并释放文件句柄" -ForegroundColor Green
    }

    # (2) 检查并释放 1420 端口（Vite 调试服务器端口）
    try {
        $portConnections = Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue
        if ($portConnections) {
            $portPids = $portConnections | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 -and $_ -ne $PID }
            if ($portPids) {
                $foundHistory = $true
                Write-Host "[!] 检测到端口 1420 被历史进程占用 (PID: $($portPids -join ', '))，正在强制退出..." -ForegroundColor Yellow
                foreach ($portPid in $portPids) {
                    try {
                        Stop-Process -Id $portPid -Force -ErrorAction SilentlyContinue
                    } catch {}
                }

                $sw = [System.Diagnostics.Stopwatch]::StartNew()
                while ((Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue) -and ($sw.ElapsedMilliseconds -lt 3000)) {
                    Start-Sleep -Milliseconds 150
                }
                Write-Host "[✓] 端口 1420 已成功释放" -ForegroundColor Green
            }
        }
    } catch {}

    if (-not $foundHistory) {
        Write-Host "[✓] 未检测到残留历史进程，环境正常" -ForegroundColor Green
    } else {
        # 缓冲 300ms 确保操作系统彻底解绑资源
        Start-Sleep -Milliseconds 300
    }
}

Stop-HistoricalProcesses

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
