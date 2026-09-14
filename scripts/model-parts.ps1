<#
.SYNOPSIS
    Split the production embedding model into git-sized parts, or rejoin them.
.DESCRIPTION
    GitHub rejects any single file larger than 100 MB and model.safetensors is
    ~1.1 GB, so the weights are committed as <95 MB parts under
    models\<id>\parts\ and reassembled on the target machine.

    split   maintainer action - run once after training or replacing a model,
            then commit models\<id>\parts\.
    join    consumer action - run automatically by setup.ps1.
    verify  hash the assembled weights against models\registry.json.

    The assembled model.safetensors is git-ignored; parts\ is the source of truth.
.EXAMPLE
    .\scripts\model-parts.ps1 -Mode split
.EXAMPLE
    .\scripts\model-parts.ps1 -Mode join
#>
[CmdletBinding()]
param(
    [ValidateSet('split', 'join', 'verify')]
    [string]$Mode = 'join',
    [string]$ModelId = 'bge-m3-medical-v2-recovered-a050-fp16',
    [int]$ChunkMB = 4,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$root       = Split-Path -Parent $PSScriptRoot
$modelDir   = Join-Path $root "models\$ModelId"
$weights    = Join-Path $modelDir 'model.safetensors'
$partsDir   = Join-Path $modelDir 'parts'
$manifest   = Join-Path $partsDir 'parts_manifest.json'
$partPrefix = 'model.safetensors.part.'

function Write-Info { param([string]$m) Write-Host "    ..   $m" -ForegroundColor DarkGray }
function Write-Ok   { param([string]$m) Write-Host "    OK   $m" -ForegroundColor Green }
function Fail {
    param([string]$Message, [string[]]$Hints = @())
    Write-Host ''
    Write-Host "ERROR: $Message" -ForegroundColor Red
    foreach ($h in $Hints) { Write-Host "       $h" -ForegroundColor Yellow }
    exit 1
}

# The registry is the single source of truth for what the weights must hash to.
function Get-ExpectedSha256 {
    $registryPath = Join-Path $root 'models\registry.json'
    if (-not (Test-Path $registryPath)) { return $null }
    $entry = (Get-Content $registryPath -Raw | ConvertFrom-Json).models |
             Where-Object { $_.id -eq $ModelId } | Select-Object -First 1
    if ($null -eq $entry) { return $null }
    return $entry.sha256
}

function Get-Sha256 {
    param([string]$Path)
    return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLower()
}

function Get-PartFiles {
    if (-not (Test-Path $partsDir)) { return @() }
    return @(Get-ChildItem -Path $partsDir -Filter "$partPrefix*" -File | Sort-Object Name)
}

# ------------------------------------------------------------------ split ---
function Invoke-Split {
    if (-not (Test-Path $weights)) {
        Fail "Nothing to split - weights not found: $weights"
    }
    $existing = Get-PartFiles
    if ($existing.Count -gt 0 -and -not $Force) {
        Fail "models\$ModelId\parts\ already holds $($existing.Count) part(s)." @(
            'Re-run with -Force to replace them.'
        )
    }
    if (Test-Path $partsDir) { Remove-Item $partsDir -Recurse -Force }
    New-Item -ItemType Directory -Path $partsDir | Out-Null

    $total  = (Get-Item $weights).Length
    Write-Info ("splitting {0:N0} MB into {1} MB parts ..." -f ($total / 1MB), $ChunkMB)

    $chunkBytes = [int64]$ChunkMB * 1MB
    $buffer     = New-Object byte[] (4 * 1MB)
    $index      = 0
    $records    = @()

    $in = [System.IO.File]::OpenRead($weights)
    try {
        while ($in.Position -lt $in.Length) {
            $partPath = Join-Path $partsDir ('{0}{1:d2}' -f $partPrefix, $index)
            $written  = [int64]0
            $out = [System.IO.File]::Create($partPath)
            try {
                while ($written -lt $chunkBytes) {
                    $want = [int][Math]::Min([int64]$buffer.Length, $chunkBytes - $written)
                    $read = $in.Read($buffer, 0, $want)
                    if ($read -le 0) { break }
                    $out.Write($buffer, 0, $read)
                    $written += $read
                }
            }
            finally { $out.Dispose() }

            $records += [ordered]@{
                name   = Split-Path $partPath -Leaf
                bytes  = $written
                sha256 = Get-Sha256 $partPath
            }
            Write-Info ("  {0}  {1:N0} MB" -f (Split-Path $partPath -Leaf), ($written / 1MB))
            $index++
        }
    }
    finally { $in.Dispose() }

    [ordered]@{
        model_id     = $ModelId
        artifact     = 'model.safetensors'
        total_bytes  = $total
        sha256       = Get-Sha256 $weights
        chunk_mb     = $ChunkMB
        part_count   = $records.Count
        parts        = $records
    } | ConvertTo-Json -Depth 4 | Set-Content -Path $manifest -Encoding utf8

    Write-Ok "$($records.Count) parts written to models\$ModelId\parts\"
    Write-Info 'now commit that folder:  git add models/ && git commit'
}

# ------------------------------------------------------------------- join ---
function Invoke-Join {
    $parts = Get-PartFiles
    if ($parts.Count -eq 0) {
        Fail "No model parts found in models\$ModelId\parts\" @(
            'The repository should ship them. Try:  git pull',
            'Or copy the full model folder from a machine that has it.'
        )
    }
    if ((Test-Path $weights) -and -not $Force) {
        if (Test-Weights) {
            Write-Ok 'model.safetensors already assembled and verified'
            return
        }
        Write-Info 'existing model.safetensors failed verification - rebuilding'
    }

    # A manifest mismatch means a truncated clone or a partial LFS/lfs-free pull.
    if (Test-Path $manifest) {
        $expectedCount = (Get-Content $manifest -Raw | ConvertFrom-Json).part_count
        if ($parts.Count -ne $expectedCount) {
            Fail "Expected $expectedCount model parts but found $($parts.Count)." @(
                'The clone is incomplete. Run:  git pull'
            )
        }
    }

    Write-Info ("assembling model.safetensors from {0} parts ..." -f $parts.Count)
    $out = [System.IO.File]::Create($weights)
    try {
        foreach ($p in $parts) {
            $in = [System.IO.File]::OpenRead($p.FullName)
            try { $in.CopyTo($out, 4 * 1MB) } finally { $in.Dispose() }
        }
    }
    finally { $out.Dispose() }

    if (-not (Test-Weights)) {
        Remove-Item $weights -Force
        Fail 'Assembled weights failed the SHA-256 check and were deleted.' @(
            'The parts are corrupt or incomplete. Run:  git pull',
            'then re-run:  .\setup.ps1'
        )
    }
    Write-Ok ("model.safetensors assembled ({0:N0} MB, SHA-256 verified)" -f ((Get-Item $weights).Length / 1MB))
}

# ----------------------------------------------------------------- verify ---
function Test-Weights {
    if (-not (Test-Path $weights)) { return $false }
    $expected = Get-ExpectedSha256
    if (-not $expected) {
        Write-Info 'registry.json has no SHA-256 for this model - size check only'
        return ((Get-Item $weights).Length -gt 0)
    }
    return ((Get-Sha256 $weights) -eq $expected.ToLower())
}

switch ($Mode) {
    'split'  { Invoke-Split }
    'join'   { Invoke-Join }
    'verify' {
        if (Test-Weights) { Write-Ok 'model.safetensors matches registry.json' }
        else { Fail 'model.safetensors is missing or does not match registry.json' @('Run:  .\scripts\model-parts.ps1 -Mode join -Force') }
    }
}
