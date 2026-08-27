# ============================================================
# rongcheng-admin: apply all fixes (P0 + P1 + P2 + system refactor)
# Run: powershell -ExecutionPolicy Bypass -File scripts\apply-fixes.ps1
# Notes:
#   - ASCII-only source (avoids GBK/UTF-8 mismatch in Windows PowerShell 5.1)
#   - Package dirs are located by wildcard + content marker, so Chinese
#     directory names are never hard-coded.
#   - P0* and P1* dirs are unique; P2* matches two dirs, so the one that
#     contains the valid auth.ts marker (the final P2 package) is chosen.
#   - Overwrites src files with the latest stacked copy from each package.
#   - Deletes dead page src\views\refund\index.vue (P0-8).
#   - Prints a self-check report after applying.
#   - If a copy fails (file locked by IDE), close the editor and rerun.
# ============================================================

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

function Get-PkgDir([string]$pattern, [string]$label) {
  $d = Get-ChildItem -Directory | Where-Object { $_.Name -like $pattern } | Select-Object -First 1
  if (-not $d) { throw "package dir not found: $label (pattern $pattern). Did you delete the package folders?" }
  return $d.FullName
}
$dirP0 = Get-PkgDir 'P0*' 'P0'
$dirP1 = Get-PkgDir 'P1*' 'P1'
# P2* matches both the broken first-attempt dir and the final P2 dir.
# Pick the one whose auth.ts contains the valid marker (the final package).
$dirP2 = Get-ChildItem -Directory | Where-Object {
  $_.Name -like 'P2*' -and
  (Test-Path (Join-Path $_.FullName 'src\stores\auth.ts')) -and
  (Get-Content -Raw (Join-Path $_.FullName 'src\stores\auth.ts') -Encoding UTF8).Contains('safeParseAdminInfo')
} | Select-Object -First 1
if (-not $dirP2) { throw 'P2 package dir not found or missing valid auth.ts marker' }
$dirP2 = $dirP2.FullName
$dirSys = Get-PkgDir 'SysFix' 'SysFix'

$map = @{
  # P0-only files
  "$dirP0\src\components\TrendChart.vue"                  = 'src\components\TrendChart.vue'
  "$dirP0\src\views\orders\bookkeeping.vue"               = 'src\views\orders\bookkeeping.vue'
  "$dirP0\src\views\orders\seal.vue"                      = 'src\views\orders\seal.vue'
  "$dirP0\src\views\orders\newspaper.vue"                 = 'src\views\orders\newspaper.vue'
  "$dirP0\src\views\content\index.vue"                    = 'src\views\content\index.vue'
  "$dirP0\src\views\outlets\OutletOverview.vue"           = 'src\views\outlets\OutletOverview.vue'
  # P1 files (P0 stacked)
  "$dirP1\src\views\orders\detail.vue"                    = 'src\views\orders\detail.vue'
  "$dirP1\src\views\outlet\Workspace.vue"                 = 'src\views\outlet\Workspace.vue'
  "$dirP1\src\views\outlets\OutletDashboard.vue"          = 'src\views\outlets\OutletDashboard.vue'
  "$dirP1\src\views\products\scenes.vue"                  = 'src\views\products\scenes.vue'
  # P2 files (P0/P1 stacked)
  "$dirP2\src\stores\auth.ts"                             = 'src\stores\auth.ts'
  "$dirP2\src\components\ModuleDonut.vue"                 = 'src\components\ModuleDonut.vue'
  "$dirP2\src\views\after-sales\after-sales-orders.vue"   = 'src\views\after-sales\after-sales-orders.vue'
  "$dirP2\src\views\after-sales\refund-records.vue"       = 'src\views\after-sales\refund-records.vue'
  "$dirP2\src\views\login\index.vue"                      = 'src\views\login\index.vue'
  "$dirP2\src\views\outlet\Login.vue"                     = 'src\views\outlet\Login.vue'
  "$dirP2\src\views\outlets\OrderAssign.vue"              = 'src\views\outlets\OrderAssign.vue'
  "$dirP2\src\views\outlets\OutletList.vue"               = 'src\views\outlets\OutletList.vue'
  "$dirP2\src\views\points\index.vue"                     = 'src\views\points\index.vue'
  "$dirP2\src\views\products\newspapers.vue"              = 'src\views\products\newspapers.vue'
  "$dirP2\src\views\products\seals.vue"                   = 'src\views\products\seals.vue'
  "$dirP2\src\views\questions\index.vue"                  = 'src\views\questions\index.vue'
  "$dirP2\src\views\reviews\index.vue"                    = 'src\views\reviews\index.vue'
  "$dirP2\src\views\system\admins.vue"                    = 'src\views\system\admins.vue'
  "$dirP2\src\views\users\index.vue"                      = 'src\views\users\index.vue'
  # System refactor (all history stacked)
  "$dirSys\src\api\index.ts"                              = 'src\api\index.ts'
  "$dirSys\src\views\transaction\index.vue"               = 'src\views\transaction\index.vue'
}

Write-Host "===== copying patch files ====="
$fail = @()
foreach ($src in $map.Keys) {
  $dst = Join-Path $root $map[$src]
  if (-not (Test-Path $src)) { $fail += "missing source: $src"; continue }
  try {
    Copy-Item -Force $src $dst -ErrorAction Stop
    Write-Host ("  [OK] " + $map[$src])
  } catch {
    $fail += $map[$src]
    Write-Host ("  [FAIL] " + $map[$src] + " -> " + $_.Exception.Message)
  }
}

Write-Host ""
Write-Host "===== delete dead page (P0-8) ====="
$dead = Join-Path $root 'src\views\refund\index.vue'
if (Test-Path $dead) {
  try { Remove-Item -Force $dead -ErrorAction Stop; Write-Host "  [OK] deleted src\views\refund\index.vue" }
  catch { $fail += 'src\views\refund\index.vue'; Write-Host "  [FAIL] cannot delete (locked by editor?), delete it manually" }
} else { Write-Host "  [OK] already deleted" }

Write-Host ""
Write-Host "===== self check ====="
$checks = @(
  @('src\api\index.ts', 'unwrapV2', 'api: unwrapV2'),
  @('src\api\index.ts', 'deliverOrderAdmin', 'api: deliverOrderAdmin'),
  @('src\api\index.ts', '!getRefundList', 'api: refund V1 removed'),
  @('src\components\TrendChart.vue', '!console.log', 'TrendChart: no debug log'),
  @('src\stores\auth.ts', 'safeParseAdminInfo', 'auth: safeParse'),
  @('src\views\content\index.vue', 'sanitizeRichText', 'content: sanitize'),
  @('src\views\orders\bookkeeping.vue', 'el-pagination', 'bookkeeping: pager'),
  @('src\views\orders\seal.vue', 'showAssignDialog(row)', 'seal: assign button'),
  @('src\views\orders\newspaper.vue', 'showAssignDialog(row)', 'newspaper: assign button'),
  @('src\views\outlets\OutletOverview.vue', 'normalizeOverview', 'overview: normalize'),
  @('src\views\orders\detail.vue', 'deliverOrderAdmin(order.value.id', 'detail: deliver axios'),
  @('src\views\outlet\Workspace.vue', 'ordersTruncated', 'workspace: truncation'),
  @('src\views\outlets\OutletDashboard.vue', "router.push({ path: '/outlets/assign'", 'dashboard: router'),
  @('src\views\products\scenes.vue', 'Promise.allSettled', 'scenes: allSettled'),
  @('src\views\products\seals.vue', 'suppressSceneWatcher', 'seals: watcher'),
  @('src\views\products\newspapers.vue', 'watch([searchKey', 'newspapers: filter watch'),
  @('src\views\after-sales\after-sales-orders.vue', 'confirmRefund(row)', 'after-sales: buttons'),
  @('src\views\after-sales\refund-records.vue', 'onFilterChange', 'refund-records: filter'),
  @('src\views\outlets\OrderAssign.vue', 'function search()', 'OrderAssign: search fn'),
  @('src\views\outlets\OutletList.vue', 'payload.settlementCycle', 'OutletList: settlementCycle'),
  @('src\views\points\index.vue', ':loading="saving"', 'points: saving'),
  @('src\views\login\index.vue', 'if (loading.value) return', 'login: guard'),
  @('src\views\outlet\Login.vue', 'if (loading.value) return', 'outlet login: guard'),
  @('src\views\questions\index.vue', "e !== 'cancel' && e !== 'close'", 'questions: close'),
  @('src\views\reviews\index.vue', "e !== 'cancel' && e !== 'close'", 'reviews: close'),
  @('src\views\users\index.vue', "e !== 'cancel' && e !== 'close'", 'users: close'),
  @('src\views\system\admins.vue', 'function formatDate(d?: string | null)', 'admins: fmt guard'),
  @('src\components\ModuleDonut.vue', '!console.log', 'ModuleDonut: no debug log'),
  @('src\views\transaction\index.vue', 'EXPORT_CSV_HEADERS', 'tx: csv export'),
  @('src\views\transaction\index.vue', 'Array.isArray(resp) ? resp : []', 'tx: no .data'),
  @('src\views\refund\index.vue', '__DEAD__', 'refund page deleted')
)
$bad = 0
foreach ($c in $checks) {
  $f = Join-Path $root $c[0]
  if ($c[0] -eq 'src\views\refund\index.vue') {
    if (Test-Path $f) { Write-Host ("  [BAD] " + $c[2] + ": file still exists"); $bad++ } else { Write-Host ("  [OK] " + $c[2]) }
    continue
  }
  if (-not (Test-Path $f)) { Write-Host ("  [BAD] " + $c[2] + ": file missing"); $bad++; continue }
  $content = Get-Content -Raw -Encoding UTF8 $f
  $neg = $c[1].StartsWith('!')
  if ($neg) { $marker = $c[1].Substring(1) } else { $marker = $c[1] }
  $hit = $content.Contains($marker)
  if (($neg -and -not $hit) -or (-not $neg -and $hit)) { Write-Host ("  [OK] " + $c[2]) } else { Write-Host ("  [BAD] " + $c[2] + ": marker check failed"); $bad++ }
}

Write-Host ""
if ($fail.Count -gt 0) {
  Write-Host ("===== " + $fail.Count + " copy/delete failure(s) =====")
  $fail | ForEach-Object { Write-Host "  - $_" }
  Write-Host "Close the editor holding these files, then rerun this script."
} elseif ($bad -eq 0) {
  Write-Host "===== ALL FIXES APPLIED, SELF-CHECK PASSED ====="
  Write-Host "Next: powershell -ExecutionPolicy Bypass -File scripts\ci-check.ps1"
} else {
  Write-Host ("===== " + $bad + " check(s) FAILED, see [BAD] above =====")
}
Pop-Location
