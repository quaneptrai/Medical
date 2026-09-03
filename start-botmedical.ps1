$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendCmd = "Set-Location -LiteralPath '$root'; .\venv\Scripts\python.exe -m uvicorn src.web.app:app --host 127.0.0.1 --port 8000 --reload"
$frontendDir = Join-Path $root 'frontend\clinic'
$frontendCmd = "Set-Location -LiteralPath '$frontendDir'; npm run dev"

Start-Process powershell.exe -ArgumentList @('-NoExit', '-Command', $backendCmd)
Start-Process powershell.exe -ArgumentList @('-NoExit', '-Command', $frontendCmd)
