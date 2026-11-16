param([ValidateRange(1024,65535)][int]$Port = 5087)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$logDir = Join-Path $root '.qa'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$mutex = New-Object Threading.Mutex($false, 'Local\SkockoArenaLauncher5087')
$locked = $false
try {
    $locked = $mutex.WaitOne(0)
    if (-not $locked) { return }
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
    $ready = $false
    try { $connection = Invoke-RestMethod "$url/api/arena/connection" -TimeoutSec 3; $ready = $true } catch {}
    if (-not $ready) {
        $exe = Join-Path $root 'BE\bin\Debug\net8.0\BE.exe'
        $existing = @(Get-Process -Name BE -ErrorAction SilentlyContinue | Where-Object { $_.Path -and [string]::Equals($_.Path, $exe, [StringComparison]::OrdinalIgnoreCase) })
        if ($existing.Count -eq 0) {
            if (-not (Test-Path (Join-Path $root 'FE\build\index.html')) -or -not (Test-Path $exe)) {
                Push-Location (Join-Path $root 'FE')
                try {
                    if (-not (Test-Path 'node_modules')) { & npm.cmd ci *> (Join-Path $logDir 'launcher-install.log'); if ($LASTEXITCODE -ne 0) { throw 'Instalacija frontenda nije uspjela.' } }
                    & npm.cmd run build *> (Join-Path $logDir 'launcher-frontend.log')
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
        $deadline = [DateTime]::UtcNow.AddSeconds(60)
        do {
            try { $connection = Invoke-RestMethod "$url/api/arena/connection" -TimeoutSec 2; $ready = $true } catch { Start-Sleep -Milliseconds 700 }
            if ($server -and $server.HasExited) { throw 'Backend se ugasio. Detalji: .qa\launcher-server-error.log' }
        } until ($ready -or [DateTime]::UtcNow -ge $deadline)
        if (-not $ready) { throw 'Server nije spreman nakon 60 sekundi. Provjeri .qa logove.' }
    }
    Start-Process "$url/arena"
} catch {
    $_ | Out-String | Set-Content -LiteralPath (Join-Path $logDir 'launcher-error.log')
    Add-Type -AssemblyName System.Windows.Forms
    [Windows.Forms.MessageBox]::Show("Pokretanje nije uspjelo: $($_.Exception.Message)`nDetalji su u .qa\launcher-error.log.", 'Skocko') | Out-Null
    exit 1
} finally {
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
