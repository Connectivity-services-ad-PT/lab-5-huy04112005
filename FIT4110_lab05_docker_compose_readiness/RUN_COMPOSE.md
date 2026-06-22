# Running the Services with Docker Compose

## Prerequisites
- Docker
- Docker Compose

## Run Instructions

1. Start the stack:
   ```bash
   docker-compose up -d --build
   ```

2. Check logs:
   ```bash
   docker-compose logs -f
   ```

3. Run Postman Tests:
   ```bash
   docker run --network fit4110_lab05_docker_compose_readiness_team-internal --rm -v "${PWD}/postman/collections:/etc/newman/collections" -v "${PWD}/postman/environments:/etc/newman/environments" -v "${PWD}/reports:/etc/reports" postman/newman run /etc/newman/collections/FIT4110_lab04_iot_docker.postman_collection.json -e /etc/newman/environments/FIT4110_lab04_local.postman_environment.json --env-var baseUrl=http://iot_app:8000 --env-var aiVisionMockUrl=http://ai_service:8001 --reporters cli,junit --reporter-junit-export /etc/reports/report.xml
   ```

4. Push image to Docker Hub (Example):
   ```bash
   # Login to Docker Hub
   docker login
   
   # Push the built images
   docker push your_username/team-iot:v0.1.0-team-iot
   docker push your_username/team-ai:v0.1.0-team-ai
   ```

5. Stop the stack:
   ```bash
   docker-compose down
   ```
Alternatively:
```bash
make down
```
