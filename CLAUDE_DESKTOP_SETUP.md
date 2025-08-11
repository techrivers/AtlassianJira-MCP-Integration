# 🖥️ Claude Desktop Setup Guide

## 🚨 **Node.js Version Issue Fix**

If you're getting Node.js version errors when connecting the MCP server to Claude Desktop, follow these steps:

---

## 🔧 **Quick Fix Solutions**

### **Solution 1: Standard Configuration (Try First)**

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

### **Solution 2: Force Node.js Path (If Solution 1 Fails)**

#### **For macOS/Linux:**
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

#### **For Windows:**
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

---

## 📍 **Configuration File Locations**

### **macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

### **Windows:**
```
%APPDATA%/Claude/claude_desktop_config.json
```

---

## 🛠️ **Troubleshooting Steps**

### **Step 1: Update Node.js**
1. **Download** latest Node.js from [nodejs.org](https://nodejs.org/) (v20+ recommended)
2. **Install** the downloaded package
3. **Restart** your terminal/command prompt
4. **Verify** with: `node --version` (should show v20+)

### **Step 2: Clear NPX Cache**
```bash
# Clear npx cache
npx clear-npx-cache

# Or manually remove cache
rm -rf ~/.npm/_npx  # macOS/Linux
rmdir /s ~/.npm/_npx  # Windows
```

### **Step 3: Test MCP Server**
```bash
# Test the server manually first
npx -y github:techrivers/AtlassianJira-MCP-Integration --version

# Should output version number without errors
```

### **Step 4: Restart Claude Desktop**
1. **Completely quit** Claude Desktop
2. **Wait 10 seconds**
3. **Restart** Claude Desktop
4. **Test** the MCP server connection

---

## 🔍 **Finding Node.js Paths**

### **macOS/Linux:**
```bash
# Find Node.js location
which node
# Example output: /usr/local/bin/node

# Find NPX location  
which npx
# Example output: /usr/local/bin/npx
```

### **Windows:**
```cmd
# Find Node.js location
where node
# Example: C:\Program Files\nodejs\node.exe

# Find NPX location
where npx
# Example: C:\Program Files\nodejs\npx.cmd
```

---

## ⚡ **Advanced Configuration**

### **Using Specific Node Version Manager**

#### **With NVM (macOS/Linux):**
```json
{
  "mcpServers": {
    "jira-activitytimeline": {
      "command": "bash",
      "args": ["-c", "source ~/.nvm/nvm.sh && nvm use 20 && npx -y github:techrivers/AtlassianJira-MCP-Integration"]
    }
  }
}
```

#### **With Node Version Manager (Windows):**
```json
{
  "mcpServers": {
    "jira-activitytimeline": {
      "command": "cmd",
      "args": ["/c", "nvm use 20 && npx -y github:techrivers/AtlassianJira-MCP-Integration"]
    }
  }
}
```

---

## 🚀 **Expected Behavior**

### **✅ Success:**
When working correctly, you should see:
```
✅ Node.js compatibility check passed (v20.x.x)
🚀 AtlassianJira MCP Integration Server
📋 Checking configuration and starting setup if needed...
```

### **❌ Failure:**
If you see Node.js version errors:
```
❌ Node.js Version Incompatibility Error
Current Node.js version: v16.13.0
Required Node.js version: >=18.0.0
```

Follow the solutions above to fix the Node.js version issue.

---

## 🆘 **Still Having Issues?**

1. **Check Claude Desktop logs** for specific error messages
2. **Test with local installation** instead of npx
3. **Contact support** with your configuration and error logs
4. **Try alternative approaches** listed in this guide

**The key is ensuring Claude Desktop uses Node.js v18+ instead of the older v16.13.0!** 🔑