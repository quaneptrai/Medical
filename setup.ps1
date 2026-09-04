<#
.SYNOPSIS
    One-command setup for the Phong kham YG platform (backend + web).
.DESCRIPTION
    Verifies prerequisites, creates the Python virtualenv, installs Python and
    Node dependencies, creates .env, and builds the ChromaDB retrieval index.
    Safe to re-run: every step is skipped when it is already done.
.EXAMPLE
    .\setup.ps1
.EXAMPLE
    .\setup.ps1 -Device cuda -BatchSize 32
#>
[CmdletBinding()]
param(
    [ValidateSet('cpu', 'cuda')]
    [string]$Device = 'cpu',
    [int]$BatchSize = 8,
    [switch]$SkipIndex,
    [switch]$ForceIndex
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$script:step = 0

function Write-Step {
    param([string]$Message)
    $script:step++
    Write-Host ''
    Write-Host ("[{0}] {1}" -f $script:step, $Message) -ForegroundColor Cyan
}
function Write-Ok    { param([string]$m) Write-Host "    OK   $m" -ForegroundColor Green }
function Write-Info  { param([string]$m) Write-Host "    ..   $m" -ForegroundColor DarkGray }
function Write-Warn2 { param([string]$m) Write-Host "    WARN $m" -ForegroundColor Yellow }
function Fail {
    param([string]$Message, [string[]]$Hints = @())
    Write-Host ''
    Write-Host "ERROR: $Message" -ForegroundColor Red
    foreach ($h in $Hints) { Write-Host "       $h" -ForegroundColor Yellow }
    exit 1
}
# Windows PowerShell turns anything a native .exe writes to stderr into an
# ErrorRecord, which $ErrorActionPreference='Stop' then treats as fatal - and
# pip/npm/chromadb all write harmless notices there. Run native commands with
# the preference relaxed and judge success by the exit code instead.
# Sets $script:NativeExitCode; output goes straight to the console so it can
# never be mistaken for the return value.
function Invoke-Native {
    param([Parameter(Mandatory)][scriptblock]$Command)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Command | Out-Host }
    finally { $ErrorActionPreference = $previous }
    $script:NativeExitCode = $LASTEXITCODE
}

Write-Host ''
Write-Host '===========================================================' -ForegroundColor Magenta
Write-Host '  Phong kham YG - Setup' -ForegroundColor Magenta
Write-Host "  Project root: $root" -ForegroundColor DarkGray
Write-Host '===========================================================' -ForegroundColor Magenta

# ---------------------------------------------------------------- Python ----
Write-Step 'Checking Python (3.10 or 3.11 required)'
$venvPython = Join-Path $root 'venv\Scripts\python.exe'

if (Test-Path $venvPython) {
    $v = & $venvPython -c "import sys; print('%d.%d' % sys.version_info[:2])"
    Write-Ok "virtualenv already exists (Python $v)"
}
else {
    $basePython = $null
    foreach ($candidate in @(@('py', '-3.11'), @('py', '-3.10'), @('python'))) {
        $exe = $candidate[0]
        $prefix = @()
        if ($candidate.Count -gt 1) { $prefix = @($candidate[1]) }
        if (-not (Get-Command $exe -ErrorAction SilentlyContinue)) { continue }
        $ver = $null
        $ErrorActionPreference = 'Continue'
        try { $ver = & $exe @prefix -c "import sys; print('%d.%d' % sys.version_info[:2])" } catch { $ver = $null }
        $ErrorActionPreference = 'Stop'
        if ($LASTEXITCODE -ne 0 -or -not $ver) { continue }
        if ($ver -eq '3.10' -or $ver -eq '3.11') {
            $basePython = @($exe) + $prefix
            Write-Ok "found Python $ver via '$($basePython -join ' ')'"
            break
        }
        Write-Info "skipping '$exe $($prefix -join ' ')' (Python $ver, needs 3.10/3.11)"
    }

    if (-not $basePython) {
        Fail 'No suitable Python found.' @(
            'Install Python 3.11 from https://www.python.org/downloads/',
            'During install tick "Add python.exe to PATH", then re-run .\setup.ps1'
        )
    }

    Write-Info 'creating virtualenv in .\venv ...'
    $head = $basePython[0]
    $tail = @()
    if ($basePython.Count -gt 1) { $tail = $basePython[1..($basePython.Count - 1)] }
    $venvDir = Join-Path $root 'venv'
    Invoke-Native { & $head @tail -m venv $venvDir }
    if ($script:NativeExitCode -ne 0) { Fail 'Failed to create the virtualenv.' }
    Write-Ok 'virtualenv created'
}

# ------------------------------------------------------ Python packages -----
Write-Step 'Installing Python dependencies (requirements.txt)'
Write-Info 'first run downloads ~2 GB (torch, transformers, chromadb) - be patient'
$reqFile = Join-Path $root 'requirements.txt'
Invoke-Native { & $venvPython -m pip install --upgrade pip --quiet --disable-pip-version-check }
Invoke-Native { & $venvPython -m pip install -r $reqFile --disable-pip-version-check }
if ($script:NativeExitCode -ne 0) { Fail 'pip install failed.' @('Check your internet connection, then re-run .\setup.ps1') }
Write-Ok 'Python dependencies installed'

# ------------------------------------------------------------- Node.js -----
Write-Step 'Checking Node.js (18+ required)'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail 'Node.js is not installed or not on PATH.' @(
        'Install the LTS build from https://nodejs.org/ then re-run .\setup.ps1'
    )
}
$nodeVersion = (& node --version).TrimStart('v')
$nodeMajor = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt 18) {
    Fail "Node.js $nodeVersion is too old." @('Install Node.js 20 LTS or newer from https://nodejs.org/')
}
Write-Ok "Node.js v$nodeVersion"

# ---------------------------------------------------- Frontend packages -----
Write-Step 'Installing web dependencies (npm)'
$frontendDir = Join-Path $root 'frontend\clinic'
if (-not (Test-Path $frontendDir)) { Fail "Frontend folder not found: $frontendDir" }

if (Test-Path (Join-Path $frontendDir 'node_modules\next')) {
    Write-Ok 'node_modules already installed (delete that folder to force a clean install)'
}
else {
    Push-Location $frontendDir
    try {
        Write-Info 'running npm install ...'
        Invoke-Native { & npm install }
        if ($script:NativeExitCode -ne 0) { Fail 'npm install failed.' @('Delete frontend\clinic\node_modules and re-run .\setup.ps1') }
    }
    finally { Pop-Location }
    Write-Ok 'web dependencies installed'
}

# ---------------------------------------------------------------- .env -----
Write-Step 'Preparing .env'
$envFile = Join-Path $root '.env'
$envSample = Join-Path $root '.env.example'
if (Test-Path $envFile) {
    Write-Ok '.env already exists (left untouched)'
}
elseif (Test-Path $envSample) {
    Copy-Item $envSample $envFile
    Write-Ok '.env created from .env.example'
    Write-Info 'fill in GEMINI_API_KEY only if you use the LLM scripts in scripts\'
}
else {
    Write-Warn2 '.env.example is missing - skipped'
}

# --------------------------------------------------------------- Model -----
Write-Step 'Checking the embedding model'
$modelDir = Join-Path $root 'models\bge-m3-medical-v2-recovered-a050-fp16'
$modelWeights = Join-Path $modelDir 'model.safetensors'
if (-not (Test-Path $modelWeights)) {
    Fail 'The fine-tuned embedding model is missing (1.1 GB - it is NOT stored in git).' @(
        "Expected file: $modelWeights",
        '',
        'Copy the whole folder from a machine that already has it:',
        '    models\bge-m3-medical-v2-recovered-a050-fp16\',
        'It must contain: model.safetensors, config.json, tokenizer.json,',
        'modules.json, 1_Pooling\, 2_Normalize\',
        '',
        'Then re-run .\setup.ps1'
    )
}
$sizeMB = [math]::Round((Get-Item $modelWeights).Length / 1MB)
Write-Ok "model present ($sizeMB MB)"

# --------------------------------------------------------------- Index -----
Write-Step 'Building the ChromaDB retrieval index (652 diseases)'
if ($SkipIndex) {
    Write-Warn2 'skipped (-SkipIndex)'
}
else {
    $buildArgs = @((Join-Path $root 'scripts\build_retrieval_index.py'), '--device', $Device, '--batch-size', "$BatchSize")
    if ($ForceIndex) { $buildArgs += '--force' }
    Write-Info "scripts\build_retrieval_index.py --device $Device --batch-size $BatchSize"
    Write-Info 'an existing, complete index is reused; a full CPU rebuild takes 10-25 minutes'
    $env:ANONYMIZED_TELEMETRY = 'False'   # silences ChromaDB telemetry noise
    Push-Location $root
    try { Invoke-Native { & $venvPython @buildArgs } }
    finally { Pop-Location }
    if ($script:NativeExitCode -ne 0) { Fail 'Index build failed.' @('Re-run a clean build: .\setup.ps1 -ForceIndex') }
    Write-Ok 'retrieval index ready'
}

# --------------------------------------------------------------- Done ------
Write-Host ''
Write-Host '===========================================================' -ForegroundColor Green
Write-Host '  SETUP COMPLETE' -ForegroundColor Green
Write-Host '===========================================================' -ForegroundColor Green
Write-Host ''
Write-Host '  Start everything with:' -ForegroundColor White
Write-Host '      .\start-botmedical.ps1' -ForegroundColor Cyan
Write-Host ''
Write-Host '  Then open:  http://localhost:3000' -ForegroundColor White
Write-Host ''
