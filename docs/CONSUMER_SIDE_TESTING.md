# Consumer-Side Testing Guide - Lab 03

This guide provides instructions for the **Consumer** (Core Business) to verify and test their connection with the **Provider** (Notification Service) using mock and local environments.

## 1. Setup Mock Server

Before building your consumer code, you can use the Prism mock server as a reliable stand-in for the Notification Service:

1. Start the mock server:
   ```bash
   npx prism mock contracts/notification.openapi.yaml --port 4010
   ```
2. Verify it is running by calling the health check:
   ```bash
   curl -i http://localhost:4010/health
   ```
3. Test publishing an event:
   ```bash
   curl -i -X POST http://localhost:4010/events/alerts \
     -H "Authorization: Bearer test-token" \
     -H "Content-Type: application/json" \
     -d @mock-data/sensor-reading-valid.json
   ```

---

## 2. Using Postman for Integration Testing

We have built a pre-configured Postman Collection:
* **Collection file**: `postman/collections/FIT4110_lab03_notification.postman_collection.json`
* **Environments**:
  * Use `postman/environments/FIT4110_lab03_mock.postman_environment.json` for testing against the mock server (port 4010).
  * Use `postman/environments/FIT4110_lab03_local.postman_environment.json` for testing against the real service code (port 3000).

### Running via Newman (CLI)
You can run the entire test suite directly from your terminal using:
```bash
# Against Mock server
npx newman run postman/collections/FIT4110_lab03_notification.postman_collection.json \
  -e postman/environments/FIT4110_lab03_mock.postman_environment.json

# Against Local server
npx newman run postman/collections/FIT4110_lab03_notification.postman_collection.json \
  -e postman/environments/FIT4110_lab03_local.postman_environment.json
```
