.PHONY: compose-up compose-down logs test-compose

compose-up:
	docker-compose up -d --build

compose-down:
	docker-compose down

logs:
	docker-compose logs -f

test-compose:
	docker run --network fit4110_lab05_docker_compose_readiness_team-internal --rm -v "${PWD}/postman/collections:/etc/newman/collections" -v "${PWD}/postman/environments:/etc/newman/environments" -v "${PWD}/reports:/etc/reports" postman/newman run /etc/newman/collections/FIT4110_lab04_iot_docker.postman_collection.json -e /etc/newman/environments/FIT4110_lab04_local.postman_environment.json --env-var baseUrl=http://iot_app:8000 --env-var aiVisionMockUrl=http://ai_service:8001 --reporters cli,junit --reporter-junit-export /etc/reports/report.xml
