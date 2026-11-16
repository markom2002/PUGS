param([ValidateRange(1024, 65535)][int]$Port = 5087, [switch]$Public, [switch]$Restart)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$backendPath = [IO.Path]::GetFullPath((Join-Path $projectRoot 'BE\bin\Debug\net8.0\BE.exe'))
$runningBackends = @(Get-Process -Name BE -ErrorAction SilentlyContinue | Where-Object { $_.Path -and [string]::Equals($_.Path, $backendPath, [StringComparison]::OrdinalIgnoreCase) })
if ($runningBackends.Count -gt 0) {
    if (-not $Restart) {
        Write-Host 'Arena je vec pokrenuta. Koristi postojece linkove:'
        $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -in $runningBackends.Id } | Select-Object -ExpandProperty LocalPort -Unique)
        if ($listeners.Count -eq 0) { $listeners = @($Port) }
        foreach ($activePort in $listeners) {
            Write-Host "Racunar: http://localhost:$activePort/arena"
            try {
                $connection = Invoke-RestMethod "http://localhost:$activePort/api/arena/connection" -TimeoutSec 5
                foreach ($lanUrl in $connection.lanUrls) { Write-Host "Telefon (Wi-Fi): $lanUrl/arena" }
                if ($connection.publicUrl) { Write-Host "Internet: $($connection.publicUrl)/arena" }
                if ($Public -and -not $connection.publicMode) { Write-Warning 'Za javni rezim pokreni .\start-arena.ps1 -Public -Restart.' }
            } catch { Write-Warning 'Server jos nije spreman. Sacekaj nekoliko sekundi pa pokusaj ponovo.' }
        }
        Write-Host 'Za novi build i restart: .\start-arena.ps1 -Restart (dodaj -Public za internet).'
        return
    }
    Write-Host 'Restart Arene prekida aktivne veze igraca.'
    foreach ($backend in $runningBackends) { Stop-Process -InputObject $backend -ErrorAction Stop; $backend.WaitForExit() }
}
$previousEnvironment = $env:ASPNETCORE_ENVIRONMENT
$previousPublic = $env:Arena__PublicMode
$previousPort = $env:Arena__Port
try {
    Push-Location (Join-Path $projectRoot 'FE')
    try {
        if (-not (Test-Path 'node_modules')) { & npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'Instalacija nije uspjela.' } }
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw 'Frontend build nije uspio.' }
    } finally { Pop-Location }
    Push-Location (Join-Path $projectRoot 'BE')
    try {
        $env:ASPNETCORE_ENVIRONMENT = 'Production'
        $env:Arena__PublicMode = $Public.IsPresent.ToString().ToLowerInvariant()
        $env:Arena__Port = $Port.ToString()
        Write-Host "Skocko Arena: http://localhost:$Port/arena"
        Write-Host "Telefon: otvori http://IP-ADRESA-OVOG-RACUNARA:$Port na istoj Wi-Fi mrezi."
        Write-Host 'Zaustavljanje: Ctrl+C'
        & dotnet run --no-launch-profile --urls "http://0.0.0.0:$Port"
        if ($LASTEXITCODE -ne 0) { throw 'Backend nije pokrenut.' }
    } finally { Pop-Location }
} finally { $env:ASPNETCORE_ENVIRONMENT = $previousEnvironment; $env:Arena__PublicMode = $previousPublic; $env:Arena__Port = $previousPort }
