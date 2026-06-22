# FIT4110 Lab 04 Makefile

.PHONY: install lint mock server test clean build run test-docker test-mock stop

IMAGE_NAME=fit4110/iot-ingestion:lab04
TAG_NAME=v0.1.0-team-notification
CONTAINER_NAME=fit4110-iot-lab04

install:
	npm install --legacy-peer-deps

lint:
	npx spectral lint contracts/notification.openapi.yaml --ruleset campus-spectral.yaml

mock:
	npx prism mock contracts/notification.openapi.yaml --port 4010

mock-notification:
	npx prism mock contracts/notification.openapi.yaml --port 4010

server:
	node server.js

test:
	powershell -ExecutionPolicy Bypass -File ./scripts/run_tests.ps1

test-mock:
	node scripts/test-runner.js mock

build:
	docker build -t $(IMAGE_NAME) -t $(TAG_NAME) .

run:
	docker run --rm --name $(CONTAINER_NAME) -p 8000:8000 --env-file .env.example $(IMAGE_NAME)

test-docker:
	npx newman run postman/collections/FIT4110_lab03_notification.postman_collection.json -e postman/environments/FIT4110_lab03_local.postman_environment.json -r cli,html,junit --reporter-html-export reports/newman-local-report.html --reporter-junit-export reports/newman-local-report.xml

stop:
	docker stop $(CONTAINER_NAME)

clean:
	rm -rf reports/*
