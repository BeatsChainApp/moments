#!/bin/bash

echo "Deploying MCP Advisory Service to Railway..."

# Install Railway CLI if not present
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login and deploy
railway login
railway link
railway up

echo "MCP service deployed. Update MCP_ENDPOINT in main gateway .env with Railway URL."