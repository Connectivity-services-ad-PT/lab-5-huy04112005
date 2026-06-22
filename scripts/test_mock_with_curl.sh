#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4010}"
AUTH_HEADER="Authorization: Bearer test-token"

echo "[Lab02] Testing Prism mock server at $BASE_URL"
echo

echo "[1/5] Happy path: GET /health"
curl -i "$BASE_URL/health"
echo "
---"

echo "[2/5] Happy path: POST /events/alerts (Publish alert.created event)"
curl -i -X POST "$BASE_URL/events/alerts" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
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
echo "
---"

echo "[3/5] Happy path: GET /events/history"
curl -i "$BASE_URL/events/history" -H "$AUTH_HEADER"
echo "
---"

echo "[4/5] Error case: GET /events/history without token"
curl -i "$BASE_URL/events/history"
echo "
---"

echo "[5/5] Error case: POST /events/alerts invalid payload (missing eventId)"
curl -i -X POST "$BASE_URL/events/alerts" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "alert.created",
    "source": "core-business",
    "severity": "HIGH",
    "message": "Phat hien chuyen dong bat thuong"
  }'
echo
