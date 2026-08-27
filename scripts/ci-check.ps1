# CI 门禁（系统性改造第 4 步）
# 不依赖 PATH 中的 npx/npm（本机 node 位于 .workbuddy，且 npm 是 .ps1 包装会触执行策略），
# 直接定位 node 并调用 node_modules 内的本地二进制。
# 用法：powershell -ExecutionPolicy Bypass -File scripts\ci-check.ps1
# 任一环节失败即退出非零，可作为提交前检查 / CI 第一步。

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  # ---- 定位 node ----
  $node = (Get-Command node -ErrorAction SilentlyContinue).Source
  if (-not $node) {
    $known = @(
      "$env:ProgramFiles\nodejs\node.exe",
      "${env:ProgramFiles(x86)}\nodejs\node.exe",
      "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
      "$env:USERPROFILE\.workbuddy\binaries\node\versions\22.22.2\node.exe"
    )
    $node = $known | Where-Object { Test-Path $_ } | Select-Object -First 1
  }
  if (-not $node) { throw '未找到 node.exe，请安装 Node.js 或把 node 加入 PATH' }
  Write-Host "node: $node"

  # ---- 1/3 类型检查 ----
  Write-Host "== 1/3 类型检查 (vue-tsc --noEmit) =="
  & $node node_modules\vue-tsc\bin\vue-tsc.js --noEmit
  if ($LASTEXITCODE -ne 0) { throw "vue-tsc 失败 ($LASTEXITCODE)" }

  # ---- 2/3 ESLint（未安装时跳过并提示） ----
  Write-Host "== 2/3 代码规范 (eslint) =="
  if (Test-Path node_modules\eslint\bin\eslint.js) {
    & $node node_modules\eslint\bin\eslint.js . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts
    if ($LASTEXITCODE -ne 0) { throw "eslint 失败 ($LASTEXITCODE)" }
  } else {
    Write-Warning 'eslint 未安装，跳过 Lint。安装：node node_modules\npm\bin\npm-cli.js i -D eslint eslint-plugin-vue @vue/eslint-config-typescript'
  }

  # ---- 3/3 生产构建 ----
  Write-Host "== 3/3 生产构建 (vite build) =="
  & $node node_modules\vite\bin\vite.js build
  if ($LASTEXITCODE -ne 0) { throw "build 失败 ($LASTEXITCODE)" }

  Write-Host ""
  Write-Host "CI PASS ✔ 类型/规范/构建全部通过"
} finally {
  Pop-Location
}
