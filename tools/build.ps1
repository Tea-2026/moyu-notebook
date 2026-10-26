$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host 'Publishing the Windows app...'
dotnet publish (Join-Path $root 'native\Moyu.App.csproj') `
  -c Release -r win-x64 --self-contained false `
  -p:DebugType=None -p:DebugSymbols=false `
  -o (Join-Path $root 'dist\win') -v minimal
if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed.' }

$winDir = Join-Path $root 'dist\win'
Get-ChildItem -Path $winDir -Filter '*.xml' -File -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path $winDir -Filter '*.pdb' -File -ErrorAction SilentlyContinue | Remove-Item -Force
Copy-Item -Path (Join-Path $root 'tools\cli\moyu.ps1') -Destination (Join-Path $winDir 'moyu.ps1') -Force
Copy-Item -Path (Join-Path $root 'tools\cli\moyu.cmd') -Destination (Join-Path $winDir 'moyu.cmd') -Force

Write-Host 'Building the standalone HTML and PWA folder...'
$python = Get-Command python -ErrorAction SilentlyContinue
if ($python) {
  & $python.Source (Join-Path $root 'tools\build_standalone.py')
  if ($LASTEXITCODE -ne 0) { throw 'build_standalone.py failed.' }
} else {
  Write-Warning 'Python was not found. Skipped the standalone HTML and PWA folder.'
}

$standalone = [string]([char]0x6478) + [string]([char]0x9C7C) + [string]([char]0x7B14) + [string]([char]0x8BB0) + [string]([char]0x672C) + '.html'
Write-Host ''
Write-Host 'Build complete:'
Write-Host '  dist\win\Moyu.exe'
Write-Host ('  dist\' + $standalone)
Write-Host '  dist\web\'
