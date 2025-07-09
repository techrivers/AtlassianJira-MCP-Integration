#!/bin/bash

echo "🚀 Pushing Jira MCP Server to GitHub"
echo "===================================="

cd /Users/uzairfayyaz/Projects/internal/mcp-server/jira-activitytimeline-server

echo "📁 Current directory: $(pwd)"

echo "🔍 Checking git status..."
git status

echo "🌿 Current branch:"
git branch --show-current

echo "🔗 Remote repositories:"
git remote -v

echo "📝 Adding all files..."
git add .

echo "📋 Checking what will be committed..."
git diff --cached --name-only

echo "💬 Committing changes..."
git commit -m "feat: Jira Activity Timeline MCP Server - Configuration-Only Ready

✨ Features:
- Complete MCP server for Jira integration
- Time logging and task creation tools
- Bulk import from spreadsheets (Excel/Google Sheets)
- Activity timeline management
- Comprehensive time reporting

🚀 Zero Installation Required:
- NPX-compatible distribution
- Configuration-only deployment
- Automatic build process
- Cross-platform compatibility

🛠️ Available Tools:
- logTime: Log work time to Jira issues
- createTask: Create new stories/tasks
- sheetToJiraStories: Bulk import from spreadsheets
- addTimeEntry: Activity timeline entries
- getTimeReport: Generate time reports
- getTimeline: Retrieve timeline data
- bulkImportTimeEntries: Import multiple entries

📚 Complete Documentation:
- Installation guide with examples
- Configuration-only setup
- Troubleshooting guide
- API documentation

Ready for community use! 🎉"

echo "🏷️ Creating release tag..."
git tag -a v1.0.0 -m "Release v1.0.0 - Initial public release

🎉 First stable release of Jira Activity Timeline MCP Server

Features:
- Complete Jira integration for Claude Desktop
- Zero installation required for users
- Configuration-only deployment
- Comprehensive tool set for time tracking and task management
- Bulk import capabilities
- Cross-platform compatibility

Perfect for teams using Jira + Claude Desktop!"

echo "📤 Pushing to GitHub..."
git push origin main

echo "🏷️ Pushing tags..."
git push origin v1.0.0

echo "✅ Successfully pushed to GitHub!"
echo ""
echo "🔗 Repository: https://github.com/techrivers/jiramcp"
echo "🎯 Users can now add this configuration to Claude Desktop:"
echo ""
echo '{
  "mcpServers": {
    "jira-activitytimeline": {
      "command": "npx",
      "args": ["-y", "https://github.com/techrivers/jiramcp.git"]
    }
  }
}'
echo ""
echo "🎉 Your MCP server is now live and ready for community use!"
