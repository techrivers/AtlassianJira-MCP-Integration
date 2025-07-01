#!/bin/bash

# Set working directory
cd "/Users/uzairfayyaz/Projects/internal/mcp-server/jira-activitytimeline-server"

# Debug: Check if .env file exists
if [ -f ".env" ]; then
    echo "Found .env file at $(date)" >> mcp-server.log
else
    echo "ERROR: .env file not found at $(date)" >> mcp-server.log
fi

# Log startup
echo "Starting Jira MCP Server at $(date)" >> mcp-server.log

# Build and start the server with error logging
npm run build && node dist/index.js 2>> mcp-server.log
