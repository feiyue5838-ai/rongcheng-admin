#Requires -Version 5.1
# 后端常驻启动：Start-Process 托管后本进程即退出，java 独立存活，
# 不随 Hermes 后台会话回收而死亡。日志落盘到 E:/代码/admin/logs/。
$ErrorActionPreference = 'Stop'

$Java = 'C:\Users\85428\.workbuddy\tmp\java-env\jdk-21.0.12+8\bin\java.exe'
$Jar = 'E:\代码\java\seal-backend\target\seal-backend-1.0.0.jar'
$WorkDir = 'E:\代码\java\seal-backend'
$EnvFile = 'D:\rongcheng-admin\server\.env'
$LogDir = 'E:\代码\admin\logs'

if (-not (Test-Path $Java)) { throw "java not found: $Java" }
if (-not (Test-Path $Jar)) { throw "jar not found: $Jar" }
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory $LogDir | Out-Null }

# 读 .env（与 scripts/launch-backend.py 同口径）
foreach ($line in (Get-Content $EnvFile -Encoding UTF8)) {
  $line = $line.Trim()
  if (-not $line -or $line.StartsWith('#') -or -not $line.Contains('=')) { continue }
  $k, $v = $line.Split('=', 2)
  $k = $k.Trim(); $v = $v.Trim().Trim('"')
  [Environment]::SetEnvironmentVariable($k, $v, 'Process')
}

[Environment]::SetEnvironmentVariable('SPRING_PROFILES_ACTIVE', 'mysql', 'Process')
[Environment]::SetEnvironmentVariable('DB_USERNAME', 'seal', 'Process')
[Environment]::SetEnvironmentVariable('SERVER_PORT', '8080', 'Process')
if (-not $env:JWT_SECRET_USER -and $env:JWT_SECRET) {
  [Environment]::SetEnvironmentVariable('JWT_SECRET_USER', $env:JWT_SECRET, 'Process')
}

$procs = Get-CimInstance Win32_Process -Filter "Name='java.exe'" |
  Where-Object { $_.CommandLine -like '*seal-backend*' }
if ($procs) { Write-Output ("backend already running PID=" + ($procs.ProcessId -join ',')); exit 0 }

Start-Process -FilePath $Java -ArgumentList '-jar', $Jar `
  -WorkingDirectory $WorkDir -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $LogDir 'backend-out.log') `
  -RedirectStandardError (Join-Path $LogDir 'backend-err.log')
Write-Output 'backend started detached'
