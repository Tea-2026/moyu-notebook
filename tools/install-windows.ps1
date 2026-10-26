#Requires -Version 5.1
<#
  Install / update Moyu Notebook into a dedicated folder and create shortcuts.

  Default target: D:\App\Moyu
  Source:         <repo>\dist\win

  This script is intentionally ASCII-only so Windows PowerShell 5.1 can read it
  regardless of the system code page.
#>
[CmdletBinding()]
param(
  [string]$InstallDir = 'D:\App\Moyu',
  [switch]$NoDesktop,
  [switch]$NoStartMenu,
  [switch]$NoPath
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'dist\win'
$sourceExe = Join-Path $source 'Moyu.exe'

if (-not (Test-Path -LiteralPath $sourceExe)) {
  throw "Moyu.exe was not found at: $sourceExe`nBuild it first with:`n  dotnet publish native\Moyu.App.csproj -c Release -r win-x64 --self-contained false -o dist\win"
}

if (Get-Process -Name Moyu -ErrorAction SilentlyContinue) {
  throw 'Moyu Notebook is running. Quit it from the tray first, then run this script again.'
}

$InstallDir = [System.IO.Path]::GetFullPath($InstallDir)
if (-not (Test-Path -LiteralPath $InstallDir)) {
  New-Item -ItemType Directory -Path $InstallDir | Out-Null
}

$sameFolder = $false
try {
  $sameFolder = ((Resolve-Path -LiteralPath $source).Path.TrimEnd('\') -ieq (Resolve-Path -LiteralPath $InstallDir).Path.TrimEnd('\'))
} catch { }

if (-not $sameFolder) {
  Write-Host "Installing to: $InstallDir"
  Copy-Item -Path (Join-Path $source '*') -Destination $InstallDir -Recurse -Force
} else {
  Write-Host "Source and install folder are the same: $InstallDir"
}

$exe = Join-Path $InstallDir 'Moyu.exe'
if (-not (Test-Path -LiteralPath $exe)) {
  throw "Installation failed: $exe is missing."
}

$name = [string]([char]0x6478) + [string]([char]0x9C7C) + [string]([char]0x7B14) + [string]([char]0x8BB0) + [string]([char]0x672C)
$description = 'Moyu Notebook - pages, passwords, and small things, kept on this device.'
$shell = New-Object -ComObject WScript.Shell

function New-MoyuShortcut {
  param([string]$Path)
  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = $exe
  $shortcut.WorkingDirectory = $InstallDir
  $shortcut.IconLocation = "$exe,0"
  $shortcut.Description = $description
  $shortcut.Save()
  Write-Host "Created: $Path"
}

if (-not $NoDesktop) {
  $desktop = [Environment]::GetFolderPath('Desktop')
  New-MoyuShortcut -Path (Join-Path $desktop "$name.lnk")
}

if (-not $NoStartMenu) {
  $programs = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
  New-MoyuShortcut -Path (Join-Path $programs "$name.lnk")
}

if (-not $NoPath) {
  try {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $parts = @()
    if ($userPath) { $parts = $userPath.Split(';', [System.StringSplitOptions]::RemoveEmptyEntries) }
    $hasDir = $false
    foreach ($part in $parts) {
      if ($part.TrimEnd('\') -ieq $InstallDir.TrimEnd('\')) { $hasDir = $true; break }
    }
    if (-not $hasDir) {
      $newPath = (($parts + $InstallDir) -join ';')
      [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
      Write-Host "Added to user PATH: $InstallDir"
      Write-Host 'Open a new terminal, then run: moyu --help'
    }
  } catch {
    Write-Warning "Could not update user PATH: $($_.Exception.Message)"
  }
}

Write-Host ''
Write-Host "Done: $exe"
Write-Host 'Press Ctrl+Alt+N to jot something down from anywhere.'
Write-Host 'Closing the window keeps it in the system tray; use the tray menu to quit.'
