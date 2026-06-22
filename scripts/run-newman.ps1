# Create reports directory
If (-Not (Test-Path -Path "reports")) {
    New-Item -ItemType Directory -Path "reports" | Out-Null
}

Write-Host "=== Running Postman tests against Prism Mock Server ===" -ForegroundColor Cyan
& npx newman run postman/collections/FIT4110_lab03_notification.postman_collection.json `
  -e postman/environments/FIT4110_lab03_mock.postman_environment.json `
  -r cli,html,junit `
  --reporter-html-export reports/newman-mock-report.html `
  --reporter-junit-export reports/newman-mock-report.xml

Write-Host "=== Running Postman tests against Local Express Server ===" -ForegroundColor Cyan
& npx newman run postman/collections/FIT4110_lab03_notification.postman_collection.json `
  -e postman/environments/FIT4110_lab03_local.postman_environment.json `
  -r cli,html,junit `
  --reporter-html-export reports/newman-local-report.html `
  --reporter-junit-export reports/newman-local-report.xml

Write-Host "=== Newman runs completed ===" -ForegroundColor Green
