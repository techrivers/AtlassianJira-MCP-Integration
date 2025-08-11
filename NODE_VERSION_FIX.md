# 🔧 Node.js Version Compatibility Fix

## 🚨 **Issue**
The MCP server requires Node.js >=18.0.0 but Claude Desktop is running it with Node.js v16.13.0, causing compatibility issues.

## ✅ **Solutions**

### **Solution 1: Force Node.js Version Check (Recommended)**

Add a Node.js version check at the start of the MCP server to ensure compatibility and provide clear error messages.

### **Solution 2: Update Claude Desktop Node.js**

Claude Desktop might be using an older Node.js version. Here's how to fix it:

#### **For macOS:**
```bash
# Check which Node.js Claude Desktop is using
which node
node --version

# Update Node.js system-wide
# If using Homebrew:
brew install node

# If using nvm:
nvm install 20
nvm use 20
nvm alias default 20

# Restart Claude Desktop completely
```

#### **For Windows:**
```bash
# Download and install latest Node.js from nodejs.org
# Or if using chocolatey:
choco upgrade nodejs

# Restart Claude Desktop
```

### **Solution 3: Clear NPX Cache**

```bash
# Clear npx cache to force fresh download
npx clear-npx-cache
# or
rm -rf ~/.npm/_npx

# Test with fresh installation
npx -y github:techrivers/AtlassianJira-MCP-Integration --version
```

### **Solution 4: Explicit Node.js Path in Configuration**

Update Claude Desktop configuration to use specific Node.js version:

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

Or for Windows:
```json
{
  "mcpServers": {
    "jira-activitytimeline": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["C:\\Program Files\\nodejs\\npx.cmd", "-y", "github:techrivers/AtlassianJira-MCP-Integration"]
    }
  }
}
```

## 🔍 **Debugging Steps**

1. **Check Node.js version in terminal:**
   ```bash
   node --version
   npm --version
   ```

2. **Test MCP server manually:**
   ```bash
   npx -y github:techrivers/AtlassianJira-MCP-Integration --version
   ```

3. **Check Claude Desktop logs:**
   - Look for Node.js version information
   - Check for dependency errors

4. **Verify package.json engines:**
   ```bash
   npm info @techrivers/atlassianjira-mcp-integration engines
   ```

## 🛠️ **Implementation Notes**

The MCP server package.json specifies:
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

This should prevent installation on incompatible Node.js versions, but Claude Desktop might bypass this check.