#Requires -Version 5.1
<#
  Build release artifacts:
    dist\release\Moyu-<version>-win-x64-portable.zip
    dist\release\Moyu-<version>-win-x64-setup.exe
    dist\release\Moyu-<version>-standalone.html
    dist\release\SHA256SUMS.txt

  The app is published self-contained so users do not need to install .NET 8.
  The installer is per-user and does not require administrator rights.
#>
[CmdletBinding()]
param(
  [string]$Version = '',
  [switch]$SkipInstaller,
  [switch]$SkipZip
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$csproj = Join-Path $root 'native\Moyu.App.csproj'

if (-not $Version) {
  $text = Get-Content -LiteralPath $csproj -Raw
  $match = [regex]::Match($text, '<Version>([^<]+)</Version>')
  if (-not $match.Success) { throw "Could not read <Version> from $csproj" }
  $Version = $match.Groups[1].Value.Trim()
}

$release = Join-Path $root 'dist\release'
$app = Join-Path $release 'app'
New-Item -ItemType Directory -Path $release -Force | Out-Null

if (Test-Path -LiteralPath $app) {
  Remove-Item -LiteralPath $app -Recurse -Force
}
New-Item -ItemType Directory -Path $app -Force | Out-Null

Write-Host "Publishing self-contained app v$Version ..."
dotnet publish $csproj `
  -c Release -r win-x64 --self-contained true `
  -p:DebugType=None -p:DebugSymbols=false -p:PublishReadyToRun=false `
  -o $app -v minimal
if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed.' }

Get-ChildItem -Path $app -Filter '*.pdb' -File -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path $app -Filter '*.xml' -File -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force
Copy-Item (Join-Path $root 'tools\cli\moyu.ps1') (Join-Path $app 'moyu.ps1') -Force
Copy-Item (Join-Path $root 'tools\cli\moyu.cmd') (Join-Path $app 'moyu.cmd') -Force

if (-not (Test-Path -LiteralPath (Join-Path $app 'Moyu.exe'))) {
  throw "Publish output is missing Moyu.exe: $app"
}

if (-not $SkipZip) {
  $zip = Join-Path $release "Moyu-$Version-win-x64-portable.zip"
  Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
  $seven = Get-Command 7z -ErrorAction SilentlyContinue
  if ($seven) {
    Write-Host "Compressing portable zip with 7-Zip ..."
    Push-Location $app
    try {
      & $seven.Source a -tzip -mx=9 $zip '.\*' | Out-Host
      if ($LASTEXITCODE -ne 0) { throw '7z failed.' }
    } finally {
      Pop-Location
    }
  } else {
    Write-Host "Compressing portable zip with Compress-Archive ..."
    Compress-Archive -Path (Join-Path $app '*') -DestinationPath $zip -CompressionLevel Optimal
  }
  Write-Host "  $zip"
}

$standaloneSource = Get-ChildItem -LiteralPath (Join-Path $root 'dist') -Filter '*.html' -File |
  Sort-Object Length -Descending |
  Select-Object -First 1
if ($standaloneSource) {
  $standalone = Join-Path $release "Moyu-$Version-standalone.html"
  Copy-Item -LiteralPath $standaloneSource.FullName -Destination $standalone -Force
  Write-Host "  $standalone"
}

if (-not $SkipInstaller) {
  $iscc = $env:ISCC_PATH
  if (-not $iscc) {
    $candidates = @(
      (Join-Path $root 'tools\InnoSetup\ISCC.exe'),
      'C:\Program Files (x86)\Inno Setup 6\ISCC.exe',
      'C:\Program Files\Inno Setup 6\ISCC.exe'
    )
    foreach ($candidate in $candidates) {
      if (Test-Path -LiteralPath $candidate) { $iscc = $candidate; break }
    }
  }
  if (-not $iscc -or -not (Test-Path -LiteralPath $iscc)) {
    throw 'ISCC.exe was not found. Install Inno Setup 6 or set ISCC_PATH.'
  }
  $setup = Join-Path $release "Moyu-$Version-win-x64-setup.exe"
  Remove-Item -LiteralPath $setup -Force -ErrorAction SilentlyContinue
  Write-Host "Building installer with $iscc ..."
  & $iscc "/DMyAppVersion=$Version" "/DMySource=$app" (Join-Path $root 'tools\installer\moyu.iss')
  if ($LASTEXITCODE -ne 0) { throw 'Inno Setup failed.' }
  if (-not (Test-Path -LiteralPath $setup)) { throw "Installer was not created: $setup" }
  Write-Host "  $setup"
}

$assets = Get-ChildItem -LiteralPath $release -File |
  Where-Object { $_.Name -like "Moyu-$Version-*" } |
  Sort-Object Name
$sums = Join-Path $release 'SHA256SUMS.txt'
$lines = foreach ($asset in $assets) {
  $hash = (Get-FileHash -LiteralPath $asset.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hash  $($asset.Name)"
}
[System.IO.File]::WriteAllLines($sums, $lines, [System.Text.UTF8Encoding]::new($false))
Write-Host "  $sums"

Write-Host ''
Write-Host 'Release artifacts:'
$assets | ForEach-Object { Write-Host ("  {0}  {1:N1} MB" -f $_.Name, ($_.Length / 1MB)) }
