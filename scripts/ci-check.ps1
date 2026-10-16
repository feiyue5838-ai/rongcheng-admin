# CI 门禁（系统性改造第 4 步）
# 不依赖 PATH 中的 npx/npm（本机 node 位于 .workbuddy，且 npm 是 .ps1 包装会触执行策略），
# 直接定位 node 并调用 node_modules 内的本地二进制。
# 用法：powershell -ExecutionPolicy Bypass -File scripts\ci-check.ps1
# 任一环节失败即退出非零，可作为提交前检查 / CI 第一步。

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  # ---- 定位 node：本机优先使用独立安装的 Node 24，不修改全局 PATH ----
  $known = @(
    'D:\NodeJS\node.exe',
    "$env:ProgramFiles\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
  )
  $node = $known | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $node) { $node = (Get-Command node -ErrorAction SilentlyContinue).Source }
  if (-not $node) { throw '未找到 node.exe，请安装 Node.js 或把 node 加入 PATH' }
  Write-Host "node: $node"

  # ---- 1/6 类型检查 ----
  Write-Host "== 1/6 类型检查 (vue-tsc --noEmit) =="
  & $node node_modules\vue-tsc\bin\vue-tsc.js --noEmit
  if ($LASTEXITCODE -ne 0) { throw "vue-tsc 失败 ($LASTEXITCODE)" }

  # ---- 2/6 ESLint ----
  Write-Host "== 2/6 代码规范 (eslint, 零告警) =="
  & $node node_modules\eslint\bin\eslint.js . --max-warnings 0
  if ($LASTEXITCODE -ne 0) { throw "eslint 失败 ($LASTEXITCODE)" }

  # ---- 3/6 单元测试 ----
  Write-Host "== 3/6 单元测试 (vitest) =="
  $qualityTmp = Join-Path $root '.codex-tmp\vitest-temp'
  New-Item -ItemType Directory -Force -Path $qualityTmp | Out-Null
  $env:TEMP = $qualityTmp
  $env:TMP = $qualityTmp
  & $node node_modules\vitest\vitest.mjs run --coverage
  if ($LASTEXITCODE -ne 0) { throw "vitest 失败 ($LASTEXITCODE)" }

  # ---- 4/6 菜单权限契约 ----
  Write-Host "== 4/6 菜单权限契约 =="
  & $node scripts\check-menu-roles.mjs
  if ($LASTEXITCODE -ne 0) { throw "菜单权限契约失败 ($LASTEXITCODE)" }

  # ---- 5/6 行政区划契约 ----
  Write-Host "== 5/6 行政区划契约 =="
  & $node scripts\check-region-alignment.cjs
  if ($LASTEXITCODE -ne 0) { throw "行政区划契约失败 ($LASTEXITCODE)" }

  # ---- 6/6 生产构建 ----
  Write-Host "== 6/6 生产构建 (vite build) =="
  & $node node_modules\vite\bin\vite.js build
  if ($LASTEXITCODE -ne 0) { throw "build 失败 ($LASTEXITCODE)" }

  Write-Host ""
  Write-Host "CI PASS ✔ 类型/规范/测试/契约/构建全部通过"
} finally {
  Pop-Location
}
