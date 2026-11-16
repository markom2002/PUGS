$ErrorActionPreference='Stop'
$infoFile=Join-Path $PSScriptRoot 'BE\arena-data\public-link.json'
if(!(Test-Path -LiteralPath $infoFile)){Write-Host 'Nema aktivne internet veze pokrenute ovom skriptom.';exit 0}
$info=Get-Content -Raw -LiteralPath $infoFile|ConvertFrom-Json
$tunnelProcess=Get-Process -Id $info.pid -ErrorAction SilentlyContinue
if($tunnelProcess){$expected=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '.tools\cloudflared.exe'));if($tunnelProcess.Path -ne $expected){throw 'PID sada pripada drugom programu; gasenje je odbijeno.'};Stop-Process -Id $tunnelProcess.Id}
Remove-Item -LiteralPath $infoFile
Write-Host 'Internet veza je ugasena. Igra na lokalnoj mrezi i dalje radi.'
