$ErrorActionPreference = "Stop"

$BaseUrl = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:4010" }
$AuthHeader = "Authorization: Bearer test-token"

Write-Host "[Lab02] Testing Prism mock server at $BaseUrl"
Write-Host ""

Write-Host "[1/5] Happy path: GET /health"
curl.exe -i "$BaseUrl/health"
Write-Host "`n---"

Write-Host "[2/5] Happy path: POST /events/alerts (Publish alert.created event)"
$payloadPath = Join-Path $PSScriptRoot "temp_payload.json"
$payload = '{
  "eventType": "alert.created",
  "eventId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babc",
  "source": "core-business",
  "alertId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babd",
  "severity": "HIGH",
  "message": "Phat hien chuyen dong bat thuong tai khu vuc Server Room",
  "occurredAt": "2026-05-22T07:30:00Z",
  "correlationId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babe",
  "details": {
    "deviceId": "CAM-SERVER-01",
    "location": "Toa nha A, Tang 3"
  }
}'
[System.IO.File]::WriteAllText($payloadPath, $payload)
curl.exe -i -X POST "$BaseUrl/events/alerts" -H $AuthHeader -H "Content-Type: application/json" -d "@$payloadPath"
if (Test-Path $payloadPath) { Remove-Item -Path $payloadPath -Force }
Write-Host "`n---"

Write-Host "[3/5] Happy path: GET /events/history"
curl.exe -i "$BaseUrl/events/history" -H $AuthHeader
Write-Host "`n---"

Write-Host "[4/5] Error case: GET /events/history without token"
curl.exe -i "$BaseUrl/events/history"
Write-Host "`n---"

Write-Host "[5/5] Error case: POST /events/alerts invalid payload (missing eventId)"
$invalidPayloadPath = Join-Path $PSScriptRoot "temp_invalid_payload.json"
$invalidPayload = '{
  "eventType": "alert.created",
  "source": "core-business",
  "severity": "HIGH",
  "message": "Phat hien chuyen dong bat thuong"
}'
[System.IO.File]::WriteAllText($invalidPayloadPath, $invalidPayload)
curl.exe -i -X POST "$BaseUrl/events/alerts" -H $AuthHeader -H "Content-Type: application/json" -d "@$invalidPayloadPath"
if (Test-Path $invalidPayloadPath) { Remove-Item -Path $invalidPayloadPath -Force }
Write-Host ""
