# 🚀 Quick Setup Guide

## **For Users: Getting Started in 3 Steps**

### **Step 1: Configure Environment**
Create configuration file at `~/.jira-mcp.env`:
```env
JIRA_URL=https://your-company.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=PROJ
```

### **Step 2: Add to Claude Desktop**
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
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

### **Step 3: Restart Claude Desktop**
The Jira tools will appear in Claude Desktop automatically!

## **Available Tools**
- **logTime** - Log work time to Jira issues
- **createTask** - Create new Jira stories/tasks
- **sheetToJiraStories** - Bulk import from spreadsheets
- **addTimeEntry** - Add Activity Timeline entries
- **getTimeReport** - Generate time reports

## **Example Usage**
```
"Log 2 hours of work to PROJ-123 for implementing user authentication"
"Create a new story for dashboard analytics feature"
"Import stories from my Google Sheet: [link]"
```

## **Getting Your API Token**
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy the token to your `.env` file

## **Troubleshooting**
- **Tools not appearing**: Check your `.env` file path and restart Claude Desktop
- **Authentication errors**: Verify your API token and permissions
- **Connection issues**: Ensure your Jira URL is correct

## **Support**
- GitHub Issues: https://github.com/yourusername/jira-activitytimeline-server/issues
- Documentation: https://github.com/yourusername/jira-activitytimeline-server

**That's it! No installation, no compilation, just configuration and go! 🎉**
