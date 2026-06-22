FROM python:3.10-slim

# Create a non-root user
RUN useradd -m -U appuser

# Install curl for healthchecks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and fix permissions
COPY src/ /app/src/
RUN chown -R appuser:appuser /app

# Switch to the non-root user
USER appuser

# Expose ports for both services (though usually one Dockerfile per service is better, 
# this matches a monorepo setup. Alternatively, you can use docker-compose commands)
EXPOSE 8000
EXPOSE 8001
