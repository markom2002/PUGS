param([ValidateRange(1024, 65535)][int]$Port = 5087)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$previousEnvironment = $env:ASPNETCORE_ENVIRONMENT
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
        Write-Host "PUGS Arena: http://localhost:$Port/arena"
        Write-Host "Telefon: otvori http://IP-ADRESA-OVOG-RACUNARA:$Port na istoj Wi-Fi mrezi."
        Write-Host 'Zaustavljanje: Ctrl+C'
        & dotnet run --no-launch-profile --urls "http://0.0.0.0:$Port"
        if ($LASTEXITCODE -ne 0) { throw 'Backend nije pokrenut.' }
    } finally { Pop-Location }
} finally { $env:ASPNETCORE_ENVIRONMENT = $previousEnvironment }
