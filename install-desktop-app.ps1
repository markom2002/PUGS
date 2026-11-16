$ErrorActionPreference='Stop'
$desktop=[Environment]::GetFolderPath('Desktop')
$shell=New-Object -ComObject WScript.Shell
$link=$shell.CreateShortcut((Join-Path $desktop 'Skočko.lnk'))
$link.TargetPath=Join-Path $env:WINDIR 'System32\cmd.exe'
$link.Arguments='/c powershell.exe -NoProfile -ExecutionPolicy Bypass -File "'+(Join-Path $PSScriptRoot 'open-arena.ps1')+'" -AppWindow -LocalOnly'
$link.WorkingDirectory=$PSScriptRoot
$link.WindowStyle=7
$link.Description='Skocko desktop aplikacija - lokalna i internet igra'
$icon=Join-Path $PSScriptRoot 'FE\public\icons\skocko.ico'
if(-not (Test-Path -LiteralPath $icon)){throw 'Ikonica nije pronadjena.'}
$link.IconLocation=$icon+',0'
$link.Save()
Write-Host 'Desktop aplikacija je dodata na Desktop.'

$oldPath=Join-Path $desktop 'Skocko aplikacija.lnk'
if(Test-Path -LiteralPath $oldPath){
    $old=$shell.CreateShortcut($oldPath)
    if($old.Arguments.IndexOf($PSScriptRoot,[StringComparison]::OrdinalIgnoreCase) -ge 0){Remove-Item -LiteralPath $oldPath}
}
