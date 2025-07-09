# 🚀 Jira Activity Timeline MCP Server

A comprehensive Model Context Protocol (MCP) server for Jira integration with Claude Desktop. Provides time logging, task creation, bulk imports, and activity timeline management.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/techrivers/jiramcp.svg)](https://github.com/techrivers/jiramcp/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/techrivers/jiramcp.svg)](https://github.com/techrivers/jiramcp/issues)

## ✨ Features

### 🎯 Core Capabilities
- **⏱️ Time Logging** - Log work time to Jira issues with detailed comments
- **📝 Task Creation** - Create new Jira stories, bugs, and tasks with full field support
- **📊 Bulk Import** - Convert Excel/Google Sheets to Jira stories efficiently
- **📈 Activity Timeline** - Track and manage time entries with Activity Timeline plugin
- **📋 Time Reports** - Generate comprehensive time reports with filtering
- **🔄 Bulk Operations** - Import multiple time entries at once

### 🛠️ Available Tools
- `logTime` - Log work time to specific Jira issues
- `createTask` - Create new Jira issues with comprehensive field support
- `sheetToJiraStories` - Convert spreadsheets to Jira stories
- `addTimeEntry` - Add detailed time entries to Activity Timeline
- `updateTimeEntry` - Update existing time entries
- `deleteTimeEntry` - Remove time entries
- `getTimeline` - Retrieve timeline data with advanced filters
- `getTimeReport` - Generate time reports (JSON/CSV/Excel)
- `bulkImportTimeEntries` - Import multiple time entries efficiently

## 🚀 Zero Installation Setup

**No NPM installation required!** Users just add configuration and restart Claude Desktop.

### Step 1: Claude Desktop Configuration
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jira-activitytimeline": {
      "command": "npx",
      "args": ["-y", "https://github.com/techrivers/jiramcp.git"]
    }
  }
}
```

### Step 2: Environment Configuration
Create `~/.jira-mcp.env`:

```env
JIRA_URL=https://your-company.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=PROJ
```

### Step 3: Restart Claude Desktop
Tools appear automatically - ready to use!

## 💡 Example Usage

```
"Log 2 hours of work to PROJ-123 for implementing user authentication"
"Create a new story for dashboard analytics feature with 8 story points"
"Import stories from my Google Sheet: https://docs.google.com/spreadsheets/d/..."
"Generate a time report for the last month in CSV format"
"Add 4 hours of frontend development time to PROJ-456"
```

## 🔧 Advanced Configuration

### Optional Environment Variables
```env
# Optional settings
JIRA_DEFAULT_ASSIGNEE=team-lead@company.com
JIRA_DEFAULT_PRIORITY=Medium
JIRA_ACTIVITY_TIMELINE_ENABLED=true
```

### Custom Field Support
The server supports custom fields for comprehensive task creation:
- Story point estimation
- Frontend/Backend/QA hour estimates
- Acceptance criteria
- Fix versions
- Custom labels and sprint assignment

## 📊 Bulk Import Features

### Spreadsheet to Jira Stories
Convert Excel files or Google Sheets to Jira stories with:
- Automatic field mapping
- Bulk validation
- Error reporting
- Progress tracking

### Example Spreadsheet Format
```csv
Summary,Description,Priority,Assignee,Story Points,Labels
User Authentication,Implement secure login,High,dev@company.com,8,security
Dashboard Widget,Analytics dashboard,Medium,frontend@company.com,5,frontend
API Integration,Third-party API,Low,backend@company.com,3,backend
```

## 🔍 What Happens Behind the Scenes

1. **NPX downloads** latest version from GitHub
2. **Automatically installs** dependencies (`npm install`)
3. **Builds TypeScript** (`npm run build`)
4. **Starts MCP server** with stdio transport
5. **Registers tools** with Claude Desktop
6. **Ready for use** - no manual steps required!

## 📚 Documentation

- **[Installation Guide](./INSTALLATION.md)** - Detailed setup instructions
- **[Configuration Guide](./CONFIG_ONLY_GUIDE.md)** - Zero-installation setup
- **[Quick Start](./QUICK_START.md)** - Get started in 3 steps
- **[Contributing](./CONTRIBUTING.md)** - Development guidelines

## 🔐 Getting Your Jira API Token

1. Visit https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name (e.g., "Claude MCP Server")
4. Copy the token to your `.jira-mcp.env` file

**Never share your API token publicly!**

## 🐛 Troubleshooting

### Common Issues

**Tools not appearing in Claude Desktop:**
- Verify `.jira-mcp.env` file exists with correct values
- Restart Claude Desktop after configuration changes
- Check Claude Desktop logs for error messages

**Authentication errors:**
- Verify Jira API token is valid and has proper permissions
- Check username/email format
- Ensure you have access to the specified project

**NPX download fails:**
- Ensure Node.js is installed (version 16+)
- Check internet connection
- Verify repository is accessible

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=true
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/techrivers/jiramcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/techrivers/jiramcp/discussions)
- **Email**: uzairfayyaz@gmail.com

## 🌟 Star History

If you find this project helpful, please consider giving it a star! ⭐

## 🎉 Ready to Get Started?

Add the configuration to Claude Desktop and start supercharging your Jira workflow with AI! 

**No installation, no compilation, just configuration and go!** 🚀

---

*Built with ❤️ for the MCP community*
