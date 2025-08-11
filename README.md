# 🚀 AtlassianJira MCP Integration Server

**Production-ready MCP server for Jira integration with dynamic configuration, time logging, task creation, issue updates, and bulk imports.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%5E5.0.0-blue)](https://www.typescriptlang.org/)

---

## ✨ **Key Features**

### 🔧 **Dynamic Configuration**
- **No setup wizard needed** - Configure through conversation with Claude
- **Real-time configuration updates** - Change settings without restart
- **Intelligent suggestions** - Get help with configuration
- **Connection testing** - Verify your Jira connection instantly

### 🛠️ **Production Tools**
- **📝 Time Logging** - Log work time to Jira issues with comments
- **📋 Task Creation** - Create comprehensive Jira issues with custom fields
- **✏️ Issue Updates** - Update existing issues, change status, modify fields  
- **📊 Bulk Import** - Import multiple stories from spreadsheets
- **⚙️ Configuration Management** - Dynamic Jira configuration tools

### 🌐 **Remote Ready**
- **GitHub NPX deployment** - Install directly from GitHub
- **Zero local setup** - Works immediately via Claude Desktop
- **Secure configuration** - Local config file with masked sensitive data

---

## 🚀 **Quick Start (Remote Installation)**

### **For Claude Desktop Users:**

**1. Add to Claude Desktop Configuration**

Edit your Claude Desktop config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "jira-activitytimeline": {
      "command": "npx",
      "args": ["-y", "github:techrivers/AtlassianJira-MCP-Integration"]
    }
  }
}
```

**2. Restart Claude Desktop**

**3. Configure Jira Connection**

In your conversation with Claude, say:
```
"I need to set up my Jira connection"
```

Claude will use the configuration tools to help you set up:
- Jira URL (e.g., `https://your-company.atlassian.net`)
- Username (your email)
- API Token (from Atlassian)
- Project key (optional default)

**4. Start Using**

Once configured, you can immediately:
- Log time: *"Log 2 hours to PROJ-123 for backend development"*
- Create tasks: *"Create a new story for user authentication"*
- Update issues: *"Update PROJ-123 status to In Progress and assign to me"*
- Import stories: *"Import these tasks from my spreadsheet"*

---

## 🛠️ **Available Tools**

### **📝 Core Tools:**
- **`logTime`** - Log work time to Jira issues with detailed comments
- **`createTask`** - Create comprehensive Jira issues with custom fields
- **`updateIssue`** - Update existing issues: fields, status, assignee, labels
- **`sheetToJiraStories`** - Bulk import stories from Excel/CSV files (Enhanced with file upload support)
- **`meetingNotesToJira`** - Parse meeting notes and create Jira issues from action items

### **⚙️ Configuration Tools:**
- **`getJiraConfiguration`** - View current configuration status
- **`updateJiraConfiguration`** - Update Jira connection settings
- **`testJiraConnection`** - Test your Jira connection
- **`resetJiraConfiguration`** - Reset all configuration
- **`suggestJiraConfiguration`** - Get configuration suggestions

### **🚫 Temporarily Disabled:**
- **`getTimeline`** - Requires Activity Timeline plugin API (see [Re-enabling](#re-enabling-activity-timeline-tools))

---

## 🔧 **Configuration Management**

### **Available Configuration Tools:**

| Tool | Description | Usage |
|------|-------------|--------|
| `getJiraConfiguration` | View current configuration status | Check what's configured |
| `updateJiraConfiguration` | Update configuration settings | Change URL, credentials, etc. |
| `testJiraConnection` | Test your Jira connection | Verify setup works |
| `resetJiraConfiguration` | Reset all configuration | Start fresh |
| `suggestJiraConfiguration` | Get configuration suggestions | Get help with setup |

### **Example Configuration Flow:**

```
User: "I need to update my Jira URL"
Claude: [calls getJiraConfiguration to check current status]
Claude: [calls updateJiraConfiguration with new URL]
Claude: [calls testJiraConnection to verify]
Claude: "✅ Your Jira URL has been updated and tested successfully!"
```

### **Configuration File Location:**
- **macOS/Linux**: `~/.jira-mcp.env`
- **Windows**: `C:\\Users\\{username}\\.jira-mcp.env`

---

## 📊 **Usage Examples**

### **Initial Setup:**
```
User: "Help me set up Jira integration"
Claude: [calls getJiraConfiguration]
Claude: "I can help you configure Jira. Let me start by checking your current setup..."
Claude: [calls suggestJiraConfiguration]
Claude: "Here's what you need to configure: URL, username, and API token."
```

### **Time Logging:**
```
User: "Log 3 hours to PROJ-123 for fixing authentication bugs"
Claude: [calls logTime]
Claude: "✅ Successfully logged 3 hours to PROJ-123 with comment about authentication bugs."
```

### **Task Creation:**
```
User: "Create a story for implementing user dashboard with high priority"
Claude: [calls createTask]
Claude: "✅ Created story PROJ-124: User Dashboard Implementation (High priority)"
```

### **Issue Updates:**
```
User: "Update PROJ-123 to In Progress status and assign to john@company.com"
Claude: [calls updateIssue]
Claude: "✅ Updated PROJ-123: status → In Progress, assignee → john@company.com"
```

### **Bulk Import from Spreadsheets:**
```
User: "Import these tasks from my Excel file"
Claude: [calls sheetToJiraStories]
Claude: "✅ Successfully imported 5 stories from your spreadsheet: PROJ-125, PROJ-126, PROJ-127, PROJ-128, PROJ-129"
```

### **Meeting Notes Processing:**
```
User: "Parse this meeting note and create action items"
Claude: [calls meetingNotesToJira]
Claude: "✅ Found 3 actionable items and created: PROJ-130 (Review API), PROJ-131 (Fix login bug), PROJ-132 (Update docs)"
```

### **Configuration Updates:**
```
User: "I need to switch to a different Jira instance"
Claude: [calls updateJiraConfiguration with new URL]
Claude: [calls testJiraConnection]
Claude: "✅ Successfully updated to new Jira instance and verified connection."
```

---

## 🚀 **Deployment Options**

### **Option 1: NPX (Recommended)**
```json
{
  "mcpServers": {
    "jira-activitytimeline": {
      "command": "npx",
      "args": ["-y", "github:techrivers/AtlassianJira-MCP-Integration"]
    }
  }
}
```

### **Option 2: Local Installation**
```bash
# Clone and build locally
git clone https://github.com/techrivers/jiramcp.git
cd jiramcp
npm install
npm run build
```

```json
{
  "mcpServers": {
    "jira-activitytimeline": {
      "command": "node",
      "args": ["./build/index.js"],
      "cwd": "/path/to/jiramcp"
    }
  }
}
```

### **Option 3: Global Installation**
```bash
npm install -g github:techrivers/AtlassianJira-MCP-Integration
```

```json
{
  "mcpServers": {
    "jira-activitytimeline": {
      "command": "jira-activitytimeline-server"
    }
  }
}
```

---

## 🔐 **Security & Privacy**

### **Configuration Security:**
- ✅ **Local storage** - All configuration stored locally on your machine
- ✅ **Masked sensitive data** - API tokens never displayed in full
- ✅ **No cloud storage** - Configuration never sent to external servers
- ✅ **Secure transmission** - HTTPS-only communication with Jira

### **API Token Setup:**
1. Visit [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create a new token with appropriate permissions
3. Use the token in your configuration (stored securely locally)

---

## 🔄 **Re-enabling Activity Timeline Tools**

The Activity Timeline tools are disabled because they require the Activity Timeline plugin API. To re-enable:

1. **Install Activity Timeline Plugin** in your Jira instance
2. **Verify API Access** - Check that `/rest/activitytimeline/1.0/` endpoints are available
3. **Contact Support** - Request re-enabling of timeline tools
4. **Tools Available After Re-enabling:**
   - `getTimeline` - Retrieve activity timeline data
   - `addTimeEntry` - Add time entries to timeline
   - `updateTimeEntry` - Update existing time entries
   - `deleteTimeEntry` - Remove time entries
   - `getTimeReport` - Generate timeline reports

---

## 🔧 **Advanced Configuration**

### **Environment Variables (Optional):**
You can also use environment variables instead of the configuration file:

```bash
export JIRA_URL="https://your-company.atlassian.net"
export JIRA_USERNAME="your-email@company.com"
export JIRA_API_TOKEN="your-api-token"
export JIRA_PROJECT_KEY="PROJ"
export JIRA_DEFAULT_ASSIGNEE="team-lead@company.com"
export JIRA_DEFAULT_PRIORITY="Medium"
```

### **Multiple Jira Instances:**
The dynamic configuration system supports switching between different Jira instances:

```
User: "Switch to my staging Jira environment"
Claude: [calls updateJiraConfiguration with staging URL]
Claude: "✅ Switched to staging environment. Ready to work with staging Jira."
```

---

## 📈 **Troubleshooting**

### **Common Issues:**

**Node.js Version Incompatibility:**
```
❌ Node.js Version Incompatibility Error
Current Node.js version: v16.13.0
Required Node.js version: >=18.0.0
```

**Solutions:**
1. **Update Node.js**: Visit [nodejs.org](https://nodejs.org/) and install v20+ (LTS)
2. **Clear NPX cache**: `npx clear-npx-cache`
3. **Restart Claude Desktop** completely after updating Node.js
4. **Use explicit Node.js path** in Claude Desktop config:
   ```json
   {
     "mcpServers": {
       "jira-activitytimeline": {
         "command": "/usr/local/bin/node",
         "args": ["/usr/local/bin/npx", "-y", "github:techrivers/AtlassianJira-MCP-Integration"]
       }
     }
   }
   ```

📋 **See [CLAUDE_DESKTOP_SETUP.md](CLAUDE_DESKTOP_SETUP.md) for detailed setup instructions.**

**Connection Failed:**
```
User: "My Jira connection isn't working"
Claude: [calls testJiraConnection]
Claude: [calls getJiraConfiguration]
Claude: "I found the issue. Let me help you update your API token..."
```

**Configuration Problems:**
```
User: "I'm getting configuration errors"
Claude: [calls getJiraConfiguration]
Claude: [calls suggestJiraConfiguration]
Claude: "Here are the missing configuration fields and suggestions..."
```

**Reset Configuration:**
```
User: "I want to start over with my configuration"
Claude: [calls resetJiraConfiguration with confirmation]
Claude: "✅ Configuration reset. Let's set up your Jira connection again..."
```

### **Debug Mode:**
Set `DEBUG=true` in your environment to see detailed logging.

---

## 🏗️ **Development**

### **Project Structure:**
```
src/
├── index.ts                    # Main MCP server entry point
├── tools/                      # MCP tool implementations
│   ├── configurationTools.ts   # Dynamic configuration tools
│   ├── createTask.ts           # Task creation
│   ├── updateIssue.ts          # Issue updates
│   ├── logTime.ts              # Time logging
│   ├── sheetToJiraStories.ts   # Enhanced bulk import with file upload
│   ├── meetingNotesToJira.ts   # Meeting notes parser with action detection
│   └── activityTimeline.ts     # Timeline tools (disabled)
└── utils/                      # Shared utilities
    ├── configManager.ts        # Dynamic configuration system
    ├── jiraFieldMapper.ts      # Field mapping and validation
    ├── jiraIssueCreator.ts     # Jira API helpers
    └── types.ts                # TypeScript definitions
```

### **Local Development:**
```bash
git clone https://github.com/techrivers/jiramcp.git
cd jiramcp
npm install
npm run dev
```

### **Building:**
```bash
npm run build
```

### **Testing:**
```bash
# Test with --help
node build/index.js --help

# Test with --version  
node build/index.js --version
```

---

## 🤝 **Contributing**

We welcome contributions! This server demonstrates:
- **Dynamic configuration patterns** for MCP servers
- **Conversational setup** instead of traditional wizards
- **Production-ready deployment** strategies
- **Security best practices** for credential management

### **Development Process:**
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following existing patterns
4. Add TypeScript types and JSDoc comments
5. Test your changes (`npm run build && npm run dev`)
6. Commit changes (`git commit -m 'feat: add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### **Code Style:**
- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public functions
- Keep functions small and focused
- Include comprehensive error handling

---

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🎯 **Why This Architecture?**

This server demonstrates a **dynamic configuration approach** that's perfect for complex, ongoing workflows:

### **Traditional Setup vs. Dynamic Configuration:**

| Traditional | Dynamic |
|-------------|---------|
| One-time setup wizard | Conversational configuration |
| Static configuration | Runtime updates |
| Manual credential management | Intelligent suggestions |
| Restart required for changes | Hot configuration updates |
| Error-prone initial setup | Guided, contextual help |

### **Perfect for Jira Workflows:**
- **Multi-project environments** - Switch between projects seamlessly
- **Credential rotation** - Update API tokens without restart
- **Team collaboration** - Share configuration patterns
- **Development stages** - Switch between dev/staging/prod instances

---

**🚀 Ready to boost your Jira productivity? Add the server to Claude Desktop and start your conversational configuration journey!**