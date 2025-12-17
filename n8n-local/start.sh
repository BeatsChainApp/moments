#!/bin/bash

echo "Starting n8n as source code..."

# Start n8n with Docker Compose
docker-compose up -d

echo "n8n running at http://localhost:5678"
echo "Login: admin / password"
echo "Workflows auto-loaded from ./workflows/"