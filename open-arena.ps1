param([ValidateRange(1024,65535)][int]$Port = 5087, [switch]$AppWindow, [switch]$LocalOnly, [switch]$NoOpen)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$logDir = Join-Path $root '.qa'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$mutex = New-Object Threading.Mutex($false, 'Local\SkockoArenaLauncher5087')
$locked = $false
try {
    try { $locked = $mutex.WaitOne(0) }
    catch [Threading.AbandonedMutexException] { $locked = $true }
    if (-not $locked) {
        Write-Host 'Prethodno pokretanje je jos u toku. Provjeravam server...'
        try {
            $null = Invoke-RestMethod "http://localhost:$Port/api/arena/connection" -TimeoutSec 5
            Start-Process "http://localhost:$Port/"
            Write-Host 'Kviz je otvoren u browseru.'
            return
        } catch { throw 'Drugo pokretanje je u toku. Sacekaj minut i pokusaj ponovo.' }
    }
    Write-Host 'Provjeravam SQL Server i aplikaciju...'
    $sql = Get-Service -Name 'MSSQL$SQLEXPRESS' -ErrorAction Stop
    if ($sql.Status -ne 'Running') {
        try { Start-Service -InputObject $sql -ErrorAction Stop }
        catch {
            $helper = Start-Process powershell.exe -Verb RunAs -WindowStyle Hidden -Wait -PassThru -ArgumentList '-NoProfile -Command "Start-Service -Name ''MSSQL$SQLEXPRESS'' -ErrorAction Stop"'
            if ($helper.ExitCode -ne 0) { throw 'SQL Server nije pokrenut.' }
        }
        $sql.WaitForStatus('Running', [TimeSpan]::FromSeconds(30))
    }
    $url = "http://localhost:$Port"
    $exe = Join-Path $root 'BE\bin\Debug\net8.0\BE.exe'
    $frontIndex=Join-Path $root 'FE\build\index.html'
    $frontSources=@(Get-ChildItem (Join-Path $root 'FE\src'),(Join-Path $root 'FE\public'),(Join-Path $root 'FE\scripts') -File -Recurse|Where-Object Name -NotMatch '\.(test|spec)\.';Get-Item (Join-Path $root 'FE\package.json'),(Join-Path $root 'FE\package-lock.json'))
    $backSources=@(Get-ChildItem (Join-Path $root 'BE\Arena') -File -Recurse;Get-Item (Join-Path $root 'BE\Program.cs'),(Join-Path $root 'BE\BE.csproj'))
    $frontStale=!(Test-Path $frontIndex)
    if(!$frontStale){$frontStale=@($frontSources|Where-Object LastWriteTimeUtc -gt (Get-Item $frontIndex).LastWriteTimeUtc).Count -gt 0}
    $backStale=!(Test-Path $exe)
    if(!$backStale){$backStale=@($backSources|Where-Object LastWriteTimeUtc -gt (Get-Item $exe).LastWriteTimeUtc).Count -gt 0}
    if($frontStale){
        Push-Location (Join-Path $root 'FE')
        try{
            if(!(Test-Path node_modules)){& cmd.exe /d /c "npm.cmd ci > `"$(Join-Path $logDir 'launcher-install.log')`" 2>&1";if($LASTEXITCODE -ne 0){throw 'Instalacija nije uspjela.'}}
            & cmd.exe /d /c "npm.cmd run build > `"$(Join-Path $logDir 'launcher-frontend.log')`" 2>&1"
            if($LASTEXITCODE -ne 0){throw 'Frontend build nije uspio.'}
        }finally{Pop-Location}
    }
    if($backStale){
        Get-Process -Name BE -ErrorAction SilentlyContinue|Where-Object {$_.Path -and [string]::Equals($_.Path,$exe,[StringComparison]::OrdinalIgnoreCase)}|Stop-Process
        & dotnet build (Join-Path $root 'BE\BE.csproj') *> (Join-Path $logDir 'launcher-build.log')
        if($LASTEXITCODE -ne 0){throw 'Backend build nije uspio.'}
    }
    $ready = $false
    try { $null = Invoke-RestMethod "$url/api/arena/health" -TimeoutSec 5; $ready = $true } catch {}
    if (-not $ready) {
        Write-Host 'Pokrecem server. Prvo pokretanje moze potrajati nekoliko minuta...'
        $exe = Join-Path $root 'BE\bin\Debug\net8.0\BE.exe'
        $existing = @(Get-Process -Name BE -ErrorAction SilentlyContinue | Where-Object { $_.Path -and [string]::Equals($_.Path, $exe, [StringComparison]::OrdinalIgnoreCase) })
        if ($existing.Count -eq 0) {
            if (-not (Test-Path (Join-Path $root 'FE\build\index.html')) -or -not (Test-Path $exe)) {
                Push-Location (Join-Path $root 'FE')
                try {
                    if (-not (Test-Path 'node_modules')) { & cmd.exe /d /c "npm.cmd ci > `"$(Join-Path $logDir 'launcher-install.log')`" 2>&1"; if ($LASTEXITCODE -ne 0) { throw 'Instalacija frontenda nije uspjela.' } }
                    & cmd.exe /d /c "npm.cmd run build > `"$(Join-Path $logDir 'launcher-frontend.log')`" 2>&1"
                    if ($LASTEXITCODE -ne 0) { throw 'Frontend build nije uspio.' }
                } finally { Pop-Location }
                & dotnet build (Join-Path $root 'BE\BE.csproj') *> (Join-Path $logDir 'launcher-build.log')
                if ($LASTEXITCODE -ne 0) { throw 'Backend build nije uspio.' }
            }
            $oldEnvironment = $env:ASPNETCORE_ENVIRONMENT
            $oldPublic = $env:Arena__PublicMode
            $oldPort = $env:Arena__Port
            try {
                $env:ASPNETCORE_ENVIRONMENT = 'Production'
                $env:Arena__PublicMode = 'true'
                $env:Arena__Port = "$Port"
                $server = Start-Process -FilePath $exe -ArgumentList '--urls', "http://0.0.0.0:$Port" -WorkingDirectory (Join-Path $root 'BE') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'launcher-server.log') -RedirectStandardError (Join-Path $logDir 'launcher-server-error.log')
            } finally {
                $env:ASPNETCORE_ENVIRONMENT = $oldEnvironment
                $env:Arena__PublicMode = $oldPublic
                $env:Arena__Port = $oldPort
            }
        }
        $deadline = [DateTime]::UtcNow.AddSeconds(180)
        do {
            try { $null = Invoke-RestMethod "$url/api/arena/health" -TimeoutSec 5; $ready = $true } catch { Start-Sleep -Milliseconds 700 }
            if ($server -and $server.HasExited) { throw 'Backend se ugasio. Detalji: .qa\launcher-server-error.log' }
        } until ($ready -or [DateTime]::UtcNow -ge $deadline)
        if (-not $ready) { throw 'Server nije spreman nakon 180 sekundi. Provjeri .qa logove.' }
    }
    Write-Host 'Pripremam HTTPS link za telefon i instalaciju...'
    try {
        if(-not $LocalOnly){
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'start-internet.ps1') -Port $Port
        if ($LASTEXITCODE -ne 0) { throw 'HTTPS veza nije dostupna.' }
        $connection = Invoke-RestMethod "$url/api/arena/connection" -TimeoutSec 5
        }
    } catch { Write-Warning 'Internet link nije dostupan. Lokalna igra i dalje radi.' }
    $openUrl = "$url/"
    if (-not $AppWindow -and -not $LocalOnly -and $connection.publicUrl -and $connection.publicUrl.StartsWith('https://')) { $openUrl = "$($connection.publicUrl)/" }
    Write-Host "Kviz je spreman: $openUrl"
    if($NoOpen){return}
    if($AppWindow){
        $edge=Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'
        if(Test-Path $edge){Start-Process $edge -ArgumentList "--app=$openUrl"}else{Start-Process $openUrl}
    }else{Start-Process $openUrl}
} catch {
    $_ | Out-String | Set-Content -LiteralPath (Join-Path $logDir 'launcher-error.log')
    Write-Host "Pokretanje nije uspjelo: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Detalji su u .qa\launcher-error.log.'
    exit 1
} finally {
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
