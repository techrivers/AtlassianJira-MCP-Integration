# 🚀 Configuration-Only Setup

Your MCP server is ready for configuration-only deployment! Users don't need to install anything.

## **User Configuration**

### **Step 1: Claude Desktop Configuration**
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

### **Step 2: Environment Configuration**
Create `~/.jira-mcp.env`:

```env
JIRA_URL=https://your-company.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=PROJ
```

### **Step 3: Restart Claude Desktop**
- Tools appear automatically
- No installation required!

## **What Happens Behind the Scenes**

1. **NPX downloads** your repository from GitHub
2. **NPX installs** dependencies (`npm install`)
3. **NPX builds** TypeScript (`npm run build`)
4. **NPX executes** the MCP server (`node build/index.js`)
5. **Tools appear** in Claude Desktop

## **Available Tools**

- `logTime` - Log work time to Jira issues
- `createTask` - Create new Jira stories/tasks
- `sheetToJiraStories` - Bulk import from spreadsheets
- `addTimeEntry` - Add Activity Timeline entries
- `getTimeReport` - Generate time reports
- `getTimeline` - Retrieve timeline data
- `bulkImportTimeEntries` - Import multiple time entries

## **Example Usage**

```
"Log 2 hours of work to PROJ-123 for implementing user authentication"
"Create a new story for dashboard analytics feature"
"Import stories from my Google Sheet: [link]"
"Generate a time report for last month"
```

## **Troubleshooting**

**Tools not appearing:**
- Check `.jira-mcp.env` file exists with correct values
- Restart Claude Desktop
- Check Claude Desktop logs for errors

**NPX fails:**
- Ensure Node.js is installed
- Check internet connection
- Verify repository is accessible

**Authentication errors:**
- Verify Jira API token is valid
- Check username/email format
- Ensure proper Jira permissions

## **Getting Jira API Token**

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy token to `.jira-mcp.env`

**Your MCP server is now ready for zero-installation deployment! 🎉**
