$ErrorActionPreference='Stop'
$desktop=[Environment]::GetFolderPath('Desktop')
$shell=New-Object -ComObject WScript.Shell
$link=$shell.CreateShortcut((Join-Path $desktop 'Skocko aplikacija.lnk'))
$link.TargetPath=Join-Path $env:WINDIR 'System32\cmd.exe'
$link.Arguments='/c powershell.exe -NoProfile -ExecutionPolicy Bypass -File "'+(Join-Path $PSScriptRoot 'open-arena.ps1')+'" -AppWindow -LocalOnly'
$link.WorkingDirectory=$PSScriptRoot
$link.WindowStyle=7
$link.Description='Skocko desktop aplikacija - lokalna i internet igra'
$link.IconLocation=(Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe')+',0'
$link.Save()
Write-Host 'Desktop aplikacija je dodata na Desktop.'
