#Requires -Version 5.1
# Start the admin frontend (vite, default port 5185) as a detached process so it
# survives the launching shell/session. Logs go to <repo>/logs/admin-dev-*.log.
# NOTE: keep this file ASCII-only. PowerShell 5.1 decodes BOM-less .ps1 as ANSI,
# which corrupts any non-ASCII literal (e.g. a Chinese repo path) - derive paths
# from $PSScriptRoot instead of hardcoding them.
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $PSCommandPath
$Repo = Split-Path -Parent $ScriptDir          # scripts/.. = admin repo root
$LogDir = Join-Path $Repo 'logs'
$Port = 5185
$Node = 'D:\NodeJS\node.exe'
$Vite = Join-Path $Repo 'node_modules\vite\bin\vite.js'

if (-not (Test-Path $Node)) { throw "node not found: $Node" }
if (-not (Test-Path $Vite)) { throw "vite not found: $Vite (run 'npm install' in the repo first)" }
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory $LogDir | Out-Null }

$busy = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
if ($busy) {
  Write-Output ("admin dev already listening on {0} PID={1}" -f $Port, (($busy.OwningProcess | Select-Object -Unique) -join ','))
  exit 0
}

Start-Process -FilePath $Node -ArgumentList $Vite, '--host', 'localhost', '--port', "$Port", '--strictPort' `
  -WorkingDirectory $Repo -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $LogDir 'admin-dev-out.log') `
  -RedirectStandardError (Join-Path $LogDir 'admin-dev-err.log')
Write-Output "admin dev started detached: http://localhost:$Port"
