#!/bin/bash

# Exits on any failure
set -e

# Create reports directory if it doesn't exist
mkdir -p reports

echo "=== STEP 1: Linting OpenAPI Contract ==="
npx spectral lint contracts/notification.openapi.yaml --ruleset campus-spectral.yaml --format text > reports/spectral-lint.log || {
  echo "Spectral linting failed! Check reports/spectral-lint.log"
  exit 1
}
cat reports/spectral-lint.log
echo "OpenAPI contract linting passed!"

echo "=== STEP 2: Running Mock Tests (Prism Mock Server) ==="
# Start Prism mock server in the background
npx prism mock contracts/notification.openapi.yaml --port 4010 > reports/prism-mock.log 2>&1 &
PRISM_PID=$!

# Wait for Prism to start
echo "Waiting for Prism mock server to spin up on port 4010..."
sleep 4

# Run Newman tests against mock environment
set +e
npx newman run postman/collections/FIT4110_lab03_notification.postman_collection.json \
  -e postman/environments/FIT4110_lab03_mock.postman_environment.json \
  -r cli,html,junit \
  --reporter-html-export reports/newman-mock-report.html \
  --reporter-junit-export reports/newman-mock-report.xml

MOCK_TEST_STATUS=$?
set -e

# Kill Prism server
echo "Stopping Prism mock server (PID: $PRISM_PID)..."
kill $PRISM_PID || true

if [ $MOCK_TEST_STATUS -ne 0 ]; then
  echo "Mock tests failed!"
  exit 1
fi
echo "Mock tests passed!"

echo "=== STEP 3: Running Local Tests (Express Server) ==="
# Start local Express server in the background
PORT=8000 node server.js > reports/express-server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for local Express server to spin up on port 8000..."
sleep 3

# Run Newman tests against local environment
set +e
npx newman run postman/collections/FIT4110_lab03_notification.postman_collection.json \
  -e postman/environments/FIT4110_lab03_local.postman_environment.json \
  -r cli,html,junit \
  --reporter-html-export reports/newman-local-report.html \
  --reporter-junit-export reports/newman-local-report.xml

LOCAL_TEST_STATUS=$?
set -e

# Kill local server
echo "Stopping local Express server (PID: $SERVER_PID)..."
kill $SERVER_PID || true

if [ $LOCAL_TEST_STATUS -ne 0 ]; then
  echo "Local tests failed!"
  exit 1
fi
echo "Local tests passed!"

echo "=== ALL LAB 03 CONTRACT TESTS PASSED SUCCESSFULLY ==="
exit 0
