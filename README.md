# Jira Activity Timeline MCP Server

A Model Context Protocol (MCP) server that provides comprehensive Jira integration including time logging, task creation, activity timeline management, and bulk story imports.

## Features

### Core Capabilities
- ✅ **Time Logging**: Log work time to Jira issues with detailed comments
- ✅ **Task Creation**: Create new Jira stories, bugs, and tasks
- ✅ **Activity Timeline**: Track and manage time entries with the Activity Timeline plugin
- ✅ **Bulk Import**: Convert spreadsheets to Jira stories efficiently
- ✅ **Time Reports**: Generate comprehensive time reports with filtering

### Available Tools
- `logTime` - Log work time to specific Jira issues
- `createTask` - Create new Jira issues with full field support
- `addTimeEntry` - Add time entries to Activity Timeline
- `updateTimeEntry` - Update existing time entries
- `deleteTimeEntry` - Remove time entries
- `getTimeline` - Retrieve timeline data with filters
- `getTimeReport` - Generate time reports
- `bulkImportTimeEntries` - Import multiple time entries
- `sheetToJiraStories` - Convert Excel/Google Sheets to Jira stories

## Quick Start

### Installation
```bash
# No installation needed - npx handles it automatically
# OR install globally if preferred:
npm install -g jira-activitytimeline-server
```

### Configuration
1. Copy the environment template:
```bash
cp .env.example .env
```

2. Configure your Jira settings in `.env`:
```env
JIRA_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=YOUR-PROJECT
```

### Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "jira-activitytimeline": {
      "command": "npx",
      "args": ["-y", "jira-activitytimeline-server"]
    }
  }
}
```

**Alternative (if installed globally):**
```json
{
  "mcpServers": {
    "jira-activitytimeline": {
      "command": "jira-activitytimeline-server",
      "args": []
    }
  }
}
```

## Configuration Guide

### Required Environment Variables
- `JIRA_URL`: Your Jira instance URL
- `JIRA_USERNAME`: Your Jira username/email
- `JIRA_API_TOKEN`: Your Jira API token ([Generate here](https://id.atlassian.com/manage-profile/security/api-tokens))
- `JIRA_PROJECT_KEY`: Default project key

### Optional Configuration
- `JIRA_ACTIVITY_TIMELINE_ENABLED`: Enable Activity Timeline features
- `JIRA_DEFAULT_ASSIGNEE`: Default assignee for new tasks
- `JIRA_DEFAULT_PRIORITY`: Default priority level

## Examples

### Time Logging
```javascript
// Log 2 hours of work
await logTime({
  issueKey: "PROJ-123",
  timeSpent: "2h",
  comment: "Implemented user authentication. Billable: Yes"
});
```

### Task Creation
```javascript
// Create a new story
await createTask({
  project: "PROJ",
  summary: "User Authentication System",
  description: "Implement secure login functionality",
  priority: "High",
  assignee: "developer@company.com",
  storyPointEstimate: 8
});
```

### Bulk Import
```javascript
// Import stories from spreadsheet
await sheetToJiraStories({
  googleSheetLink: "https://docs.google.com/spreadsheets/d/..."
});
```

## Advanced Usage

### Activity Timeline Integration
Requires the Activity Timeline plugin in Jira:
```javascript
// Add detailed time entry
await addTimeEntry({
  issueKey: "PROJ-123",
  timeSpent: "4h",
  activityType: "Development",
  billableHours: 4,
  comment: "Backend API development"
});
```

### Time Reports
```javascript
// Generate team time report
await getTimeReport({
  dateFrom: "2025-01-01",
  dateTo: "2025-01-31",
  projectKey: "PROJ",
  format: "csv"
});
```

## Troubleshooting

### Common Issues

**Authentication Error**
- Verify your API token is valid
- Check your username/email format
- Ensure you have proper Jira permissions

**Tool Not Found**
- Verify the MCP server is running
- Check your Claude Desktop configuration
- Restart Claude Desktop after configuration changes

**Time Logging Fails**
- Ensure the issue key exists
- Check you have permission to log time
- Verify time format (e.g., "2h 30m")

### Debug Mode
Enable debug logging by setting environment variable:
```bash
DEBUG=true
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/yourusername/jira-activitytimeline-server/issues) page.
