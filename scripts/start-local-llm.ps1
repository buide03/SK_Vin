param([switch]$Background)
$ErrorActionPreference = 'Stop'
$runtime = Join-Path $env:USERPROFILE '.cache\sk-vin-ollama\runtime\ollama.exe'
if (-not (Test-Path -LiteralPath $runtime)) {
    $installed = Get-Command ollama -ErrorAction SilentlyContinue
    if (-not $installed) { throw 'Chưa có Ollama. Cài từ https://ollama.com/download/windows rồi chạy lại.' }
    $runtime = $installed.Source
}
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_DEBUG = 'false'
$env:OLLAMA_MODELS = Join-Path $env:USERPROFILE '.cache\sk-vin-ollama\models'
try { $version = Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 2 } catch { $version = $null }
if ($version) { Write-Output "Ollama đã chạy: $($version.version)"; return }
if ($Background) {
    $logDir = Join-Path $env:USERPROFILE '.cache\sk-vin-ollama'
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $proc = Start-Process -FilePath $runtime -ArgumentList 'serve' -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'server.stdout.log') -RedirectStandardError (Join-Path $logDir 'server.stderr.log') -PassThru
    Write-Output "Đã khởi động Ollama local, PID $($proc.Id). API: http://127.0.0.1:11434"
} else {
    & $runtime serve
}
