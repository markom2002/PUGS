param([ValidateRange(1024,65535)][int]$Port=5087)
$ErrorActionPreference='Stop'
$projectRoot=$PSScriptRoot
$mutex=New-Object Threading.Mutex($false,"Local\SkockoInternet$Port")
$locked=$false
try{
try{$locked=$mutex.WaitOne(0)}catch [Threading.AbandonedMutexException]{$locked=$true}
if(!$locked){throw 'Priprema internet veze je vec u toku.'}
$health=Invoke-RestMethod "http://localhost:$Port/api/arena/health" -TimeoutSec 5
if(!$health.ok -or !$health.instanceId){throw 'Pokreni najnoviju verziju servera preko desktop aplikacije.'}
function Test-PublicLink($address){
 try{$probe=Invoke-RestMethod "$address/api/arena/health" -TimeoutSec 4;return $probe.ok -and $probe.instanceId -eq $health.instanceId}catch{return $false}
}
$connection=Invoke-RestMethod "http://localhost:$Port/api/arena/connection"
if(!$connection.publicMode){throw 'Prvo pokreni .\start-arena.ps1 -Public. Internet dijeljenje zahtijeva Arena-only rezim.'}
if($connection.publicUrl -and (Test-PublicLink $connection.publicUrl)){Write-Host "Internet igra vec radi: $($connection.publicUrl)";exit 0}
$tools=Join-Path $projectRoot '.tools';New-Item -ItemType Directory -Path $tools -Force|Out-Null
$binary=Join-Path $tools 'cloudflared.exe'
$savedLink=Join-Path $projectRoot 'BE\arena-data\public-link.json'
if(Test-Path -LiteralPath $savedLink){
 try{
  $saved=Get-Content -Raw -LiteralPath $savedLink|ConvertFrom-Json
  $owned=Get-Process -Id $saved.pid -ErrorAction Stop
  if([string]::Equals($owned.Path,$binary,[StringComparison]::OrdinalIgnoreCase)){Stop-Process -Id $owned.Id -ErrorAction Stop}
 }catch{}
}
if(!(Test-Path -LiteralPath $binary)){
 Write-Host 'Preuzimam zvanicni Cloudflare tunnel alat...'
 $release=Invoke-RestMethod 'https://api.github.com/repos/cloudflare/cloudflared/releases/latest'
 $asset=$release.assets|Where-Object name -eq 'cloudflared-windows-amd64.exe'
 if(!$asset){throw 'Zvanicni Windows alat nije dostupan.'}
 Invoke-WebRequest -UseBasicParsing $asset.browser_download_url -OutFile $binary
 if($asset.digest -and $asset.digest.StartsWith('sha256:')){if((Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash -ne $asset.digest.Substring(7)){throw 'Provjera preuzetog alata nije prosla.'}}
}
$stamp=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds();$log=Join-Path $tools "tunnel-$stamp.log"
$relativeLog=Join-Path '.tools' "tunnel-$stamp.log"
$process=Start-Process -FilePath $binary -ArgumentList @('tunnel','--no-autoupdate','--protocol','http2','--url',"http://localhost:$Port",'--logfile',$relativeLog) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput ($log+".out") -RedirectStandardError ($log+".err") -PassThru
$deadline=[DateTimeOffset]::UtcNow.AddSeconds(120);$publicUrl=$null
while([DateTimeOffset]::UtcNow -lt $deadline){
 if($process.HasExited){throw "Internet veza nije pokrenuta. Pogledaj $log"}
 if(Test-Path -LiteralPath $log){$match=[regex]::Match((Get-Content -Raw -LiteralPath $log),'https://[a-z0-9-]+\.trycloudflare\.com');if($match.Success -and (Test-PublicLink $match.Value)){$publicUrl=$match.Value;break}}
 Start-Sleep -Milliseconds 500
}
if(!$publicUrl){Stop-Process -Id $process.Id;throw "Nije dobijen HTTPS link. Pogledaj $log"}
$data=Join-Path $projectRoot 'BE\arena-data';New-Item -ItemType Directory -Path $data -Force|Out-Null
[IO.File]::WriteAllText((Join-Path $data 'public-link.json'),(@{url=$publicUrl;pid=$process.Id;startedAt=[DateTimeOffset]::UtcNow.ToString('o')}|ConvertTo-Json))
Write-Host "IGRA PREKO INTERNETA: $publicUrl"
Write-Host 'Otvori ovaj link i na svom uredjaju prije kreiranja sobe. Na telefonu mozes instalirati aplikaciju.'
Write-Host 'Racunar, backend i ova internet veza moraju ostati ukljuceni. Adresa je privremena.'
Write-Host 'Za gasenje: .\stop-internet.ps1'
}finally{if($locked){$mutex.ReleaseMutex()};$mutex.Dispose()}
