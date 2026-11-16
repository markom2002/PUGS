$ErrorActionPreference = 'Stop'
$launcher = Join-Path $PSScriptRoot 'open-arena.ps1'
if (-not (Test-Path -LiteralPath $launcher)) { throw 'open-arena.ps1 nije pronadjen.' }
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'Pokreni Skocko.cmd'
$content = '@echo off' + "`r`n" + 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $launcher + '"' + "`r`n" + 'if errorlevel 1 pause' + "`r`n"
[IO.File]::WriteAllText($shortcutPath, $content, [Text.Encoding]::Default)
if (-not (Test-Path -LiteralPath $shortcutPath)) { throw 'Desktop pokretac nije sacuvan.' }
Write-Host "Pokretac je sacuvan: $shortcutPath"
