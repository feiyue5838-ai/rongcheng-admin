#Requires -Version 5.1
# 后端常驻启动：Start-Process 托管后本进程即退出，java 独立存活，
# 不随 Hermes 后台会话回收而死亡。日志落盘到 E:/代码/admin/logs/。
$ErrorActionPreference = 'Stop'

$Java = 'C:\Users\85428\.workbuddy\tmp\java-env\jdk-21.0.12+8\bin\java.exe'
$Jar = 'E:\代码\java\seal-backend\target\seal-backend-1.0.0.jar'
$WorkDir = 'E:\代码\java\seal-backend'
# 凭据唯一来源：本机加固后的运行账号配置（旧 seal@localhost 已锁定，不可再用）
$EnvFile = 'E:\代码\java\runtime\mysql-local\app.env'
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
[Environment]::SetEnvironmentVariable('DB_USERNAME', $env:MYSQL_USERNAME, 'Process')
[Environment]::SetEnvironmentVariable('DB_PASSWORD', $env:MYSQL_PASSWORD, 'Process')
[Environment]::SetEnvironmentVariable('SERVER_PORT', '8080', 'Process')

$missing = @()
foreach ($k in @('DB_USERNAME','DB_PASSWORD','JWT_SECRET_ADMIN','JWT_SECRET_USER','JWT_SECRET_OUTLET')) {
  if (-not [Environment]::GetEnvironmentVariable($k, 'Process')) { $missing += $k }
}
if ($missing.Count -gt 0) { throw ("凭据缺失，无法启动: " + ($missing -join ',')) }

$procs = Get-CimInstance Win32_Process -Filter "Name='java.exe'" |
  Where-Object { $_.CommandLine -like ("*" + $Jar + "*") }
if ($procs) { Write-Output ("backend already running PID=" + ($procs.ProcessId -join ',')); exit 0 }

Start-Process -FilePath $Java -ArgumentList '-jar', $Jar `
  -WorkingDirectory $WorkDir -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $LogDir 'backend-out.log') `
  -RedirectStandardError (Join-Path $LogDir 'backend-err.log')
Write-Output 'backend started detached'
