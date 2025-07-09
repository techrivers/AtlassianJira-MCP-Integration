# 🚀 Installation Guide - No NPM Publishing Required!

## **Method 1: NPX from GitHub** ⭐ **RECOMMENDED**

### **For Users: Zero Installation Setup**

**Step 1: Add to Claude Desktop Configuration**
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jira-activitytimeline": {
      "command": "npx",
      "args": [
        "-y",
        "https://github.com/yourusername/jira-activitytimeline-server.git"
      ]
    }
  }
}
```

**Step 2: Create Environment Configuration**
Create `~/.jira-mcp.env`:

```env
JIRA_URL=https://your-company.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=PROJ
```

**Step 3: Restart Claude Desktop**
- Tools appear automatically
- No manual installation required!

### **What Happens Behind the Scenes**
1. NPX downloads latest version from GitHub
2. Automatically runs `npm install` (installs dependencies)
3. Automatically runs `npm run build` (compiles TypeScript)
4. Starts the MCP server
5. Tools become available in Claude Desktop

---

## **Method 2: Docker Distribution** 🐳

### **For Users: Docker-based Setup**

**Step 1: Add to Claude Desktop Configuration**
```json
{
  "mcpServers": {
    "jira-activitytimeline": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "JIRA_URL",
        "-e",
        "JIRA_USERNAME", 
        "-e",
        "JIRA_API_TOKEN",
        "-e",
        "JIRA_PROJECT_KEY",
        "ghcr.io/yourusername/jira-activitytimeline-server"
      ],
      "env": {
        "JIRA_URL": "https://your-company.atlassian.net",
        "JIRA_USERNAME": "your-email@company.com",
        "JIRA_API_TOKEN": "your-api-token",
        "JIRA_PROJECT_KEY": "PROJ"
      }
    }
  }
}
```

**Step 2: Restart Claude Desktop**
- Docker automatically pulls and runs the container
- No local installation required!

---

## **Method 3: Direct Git Clone** 📂

### **For Advanced Users**

**Step 1: Clone and Build**
```bash
git clone https://github.com/yourusername/jira-activitytimeline-server.git
cd jira-activitytimeline-server
npm install
npm run build
```

**Step 2: Add to Claude Desktop Configuration**
```json
{
  "mcpServers": {
    "jira-activitytimeline": {
      "command": "node",
      "args": ["/path/to/jira-activitytimeline-server/build/index.js"]
    }
  }
}
```

---

## **Available Tools**

Once configured, you'll have access to these tools:

### **Time Management**
- `logTime` - Log work time to Jira issues
- `addTimeEntry` - Add Activity Timeline entries
- `getTimeReport` - Generate time reports
- `getTimeline` - Retrieve timeline data

### **Task Management**
- `createTask` - Create new Jira stories/tasks
- `sheetToJiraStories` - Bulk import from spreadsheets
- `bulkImportTimeEntries` - Import multiple time entries

### **Example Usage**
```
"Log 2 hours of work to PROJ-123 for implementing user authentication"
"Create a new story for dashboard analytics feature"
"Import stories from my Google Sheet: [link]"
"Generate a time report for last month"
```

---

## **Troubleshooting**

### **Common Issues**

**Tools not appearing in Claude Desktop**
- Verify your `.jira-mcp.env` file exists and has correct values
- Restart Claude Desktop after configuration changes
- Check Claude Desktop logs for error messages

**Authentication errors**
- Verify your Jira API token is valid
- Check your username/email format
- Ensure you have proper Jira permissions

**NPX fails to download**
- Ensure you have Node.js installed
- Check your internet connection
- Try running `npx -y https://github.com/yourusername/jira-activitytimeline-server.git` manually

**Docker issues**
- Ensure Docker is installed and running
- Check if container image is accessible
- Verify environment variables are set correctly

---

## **Getting Your Jira API Token**

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name (e.g., "Claude MCP Server")
4. Copy the token to your `.env` file

**Never share your API token publicly!**

---

## **Support**

- **Issues**: https://github.com/yourusername/jira-activitytimeline-server/issues
- **Documentation**: https://github.com/yourusername/jira-activitytimeline-server
- **Discussions**: https://github.com/yourusername/jira-activitytimeline-server/discussions

## **No NPM Publishing Required!** 🎉

Users can start using your MCP server immediately with just configuration - no package installation, no compilation, no technical setup required!
