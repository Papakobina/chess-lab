$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$bundledNode = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
if (Test-Path -LiteralPath $bundledNode) {
    $chessNode = $bundledNode
} else {
    $chessNode = (Get-Command node -ErrorAction Stop).Source
}
if (-not (Test-Path -LiteralPath 'node_modules/vite/bin/vite.js')) {
    throw 'Dependencies are missing. Install Node.js 22+, then run npm install in this folder.'
}
if (-not (Test-Path -LiteralPath 'public/engine/stockfish-19-lite-single.wasm')) {
    & $chessNode scripts/download-engine.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Engine download failed.' }
}
& $chessNode scripts/download-openings.mjs
if ($LASTEXITCODE -ne 0) { throw 'Opening database setup failed.' }
Write-Host 'Chess Lab: http://127.0.0.1:5173 — press Ctrl+C to stop.'
& $chessNode node_modules/vite/bin/vite.js

