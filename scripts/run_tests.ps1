# PowerShell script to run Lab 03 contract tests (Mock and Local)

$ErrorActionPreference = "Stop"

# Create reports directory
If (-Not (Test-Path -Path "reports")) {
    New-Item -ItemType Directory -Path "reports" | Out-Null
}

Write-Host "=== STEP 1: Linting OpenAPI Contract ===" -ForegroundColor Cyan
& npx spectral lint contracts/notification.openapi.yaml --ruleset campus-spectral.yaml --format text | Out-File -FilePath "reports/spectral-lint.log" -Encoding utf8
$lintContent = Get-Content "reports/spectral-lint.log"
Write-Host $lintContent
Write-Host "OpenAPI contract linting passed!`n" -ForegroundColor Green

Write-Host "=== STEP 2: Running Mock Tests (Prism Mock Server) ===" -ForegroundColor Cyan
# Start Prism mock server in background
$prismProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx prism mock contracts/notification.openapi.yaml --port 4010" -NoNewWindow -PassThru

Write-Host "Waiting for Prism mock server to spin up on port 4010..."
Start-Sleep -Seconds 5

# Run Newman tests against mock environment
$ErrorActionPreference = "Continue"
& npx newman run postman/collections/FIT4110_lab03_notification.postman_collection.json `
  -e postman/environments/FIT4110_lab03_mock.postman_environment.json `
  -r cli,html,junit `
  --reporter-html-export reports/newman-mock-report.html `
  --reporter-junit-export reports/newman-mock-report.xml

$mockTestStatus = $LASTEXITCODE
$ErrorActionPreference = "Stop"

# Stop Prism server
Write-Host "Stopping Prism mock server (PID: $($prismProcess.Id))..."
Stop-Process -Id $prismProcess.Id -Force -ErrorAction SilentlyContinue

If ($mockTestStatus -ne 0) {
    Write-Host "Mock tests failed!" -ForegroundColor Red
    Exit 1
}
Write-Host "Mock tests passed!`n" -ForegroundColor Green

Write-Host "=== STEP 3: Running Local Tests (Express Server) ===" -ForegroundColor Cyan
# Start local Express server in background
$env:PORT = "8000"
$serverProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -NoNewWindow -PassThru

Write-Host "Waiting for local Express server to spin up on port 8000..."
Start-Sleep -Seconds 4

# Run Newman tests against local environment
$ErrorActionPreference = "Continue"
& npx newman run postman/collections/FIT4110_lab03_notification.postman_collection.json `
  -e postman/environments/FIT4110_lab03_local.postman_environment.json `
  -r cli,html,junit `
  --reporter-html-export reports/newman-local-report.html `
  --reporter-junit-export reports/newman-local-report.xml

$localTestStatus = $LASTEXITCODE
$ErrorActionPreference = "Stop"

# Stop local Express server
Write-Host "Stopping local Express server (PID: $($serverProcess.Id))..."
Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue

If ($localTestStatus -ne 0) {
    Write-Host "Local tests failed!" -ForegroundColor Red
    Exit 1
}
Write-Host "Local tests passed!`n" -ForegroundColor Green

Write-Host "=== ALL LAB 03 CONTRACT TESTS PASSED SUCCESSFULLY ===" -ForegroundColor Green
Exit 0
