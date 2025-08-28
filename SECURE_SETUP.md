# 🔐 Secure Jira MCP Integration Setup Guide

This guide covers the production-ready secure credential management system for the Jira MCP Integration Server. Your API tokens are **NEVER** exposed to AI systems and are stored using industry-standard security practices.

## 🚀 Quick Setup (Recommended)

### Step 1: Add to Claude Desktop Configuration

Add this configuration to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "atlassian-jira": {
      "command": "npx",
      "args": ["-y", "@techrivers/atlassianjira-mcp-integration"],
      "env": {
        "MCP_MODE": "true",
        "SKIP_UI_SETUP": "true"
      }
    }
  }
}
```

### Step 2: Secure Credential Configuration

Open a terminal and run:

```bash
npx @techrivers/atlassianjira-mcp-integration --configure
```

This launches the **Secure CLI Configuration Tool** that:

- ✅ Prompts securely for credentials (API tokens never visible)
- ✅ Stores credentials in OS credential managers:
  - **macOS**: Keychain Access
  - **Windows**: Credential Manager  
  - **Linux**: Secret Service (libsecret)
- ✅ Falls back to AES-256 encrypted local storage
- ✅ Ensures credentials are **NEVER** exposed to AI systems
- ✅ Tests your connection before storing
- ✅ Works across all platforms

### Step 3: Start Using with Claude

That's it! Your Jira integration is now secure and ready. Start a conversation with Claude:

> "Help me create a Jira ticket for the bug I found"

## 🔒 Security Architecture

### Multi-Layer Security Approach

1. **OS Credential Managers (Primary)**
   - macOS: Keychain Access with application-specific access
   - Windows: Windows Credential Manager with encrypted storage
   - Linux: Secret Service (libsecret) with GNOME Keyring/KWallet

2. **AES-256 Encrypted Storage (Fallback)**
   - 256-bit encryption with random initialization vectors
   - Secure master key generation and storage
   - File permissions restricted to owner (chmod 600)

3. **AI Safety Measures**
   - API tokens blocked from conversation updates
   - Masked sensitive data in configuration tools
   - Security-first error messages
   - Secure CLI prompts with hidden input

### Storage Locations

**Secure Credentials**: `~/.jira-mcp-secure/`
- `config.secure` - Encrypted configuration (if OS manager unavailable)
- `metadata.json` - Non-sensitive settings
- `.key` - Master encryption key (restricted permissions)

**Legacy Compatibility**: `~/.jira-mcp.env` (less secure, for compatibility)

## 🛠 Configuration Options

### Required Information

- **Jira URL**: `https://your-company.atlassian.net`
- **Username**: `your-email@company.com`  
- **API Token**: Get from [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

### Optional Settings

- **Project Key**: `PROJ` (default project for new tickets)
- **Default Assignee**: `team-lead@company.com`
- **Default Priority**: `Medium`

### API Token Setup

1. Visit: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a descriptive name (e.g., "MCP Integration")
4. Copy the generated token (you won't see it again)
5. Use in the secure configuration tool

## 🔧 Alternative Configuration Methods

### Environment Variables (Less Secure)

Set these in your MCP configuration's `env` block:

```json
{
  "mcpServers": {
    "atlassian-jira": {
      "command": "npx",
      "args": ["-y", "@techrivers/atlassianjira-mcp-integration"],
      "env": {
        "MCP_MODE": "true",
        "JIRA_URL": "https://your-company.atlassian.net",
        "JIRA_USERNAME": "your-email@company.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

⚠️ **Warning**: This method exposes credentials in configuration files. Use the secure CLI tool instead.

### Legacy File Configuration

Create `~/.jira-mcp.env`:

```bash
JIRA_URL=https://your-company.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=PROJ
JIRA_DEFAULT_ASSIGNEE=team-lead@company.com
JIRA_DEFAULT_PRIORITY=Medium
```

⚠️ **Warning**: This method is less secure. Use the secure CLI tool instead.

## 🔍 Troubleshooting

### Connection Issues

1. **Test your configuration**:
   ```bash
   npx @techrivers/atlassianjira-mcp-integration --configure
   ```
   The tool includes connection testing.

2. **Common Issues**:
   - Wrong Jira URL format (must be https://)
   - Invalid API token (check expiration)
   - Network connectivity issues
   - Corporate firewall blocking requests

### Credential Storage Issues

1. **macOS Keychain Issues**:
   - Allow access when prompted
   - Check Keychain Access app for stored credentials
   - Look for service: "jira-mcp-integration"

2. **Windows Credential Manager**:
   - Open Control Panel → Credential Manager
   - Look under Generic Credentials
   - Service name: "jira-mcp-integration"

3. **Linux Secret Service**:
   - Ensure libsecret is installed: `sudo apt-get install libsecret-tools`
   - Check with: `secret-tool lookup service jira-mcp-integration`

### Fallback to Encrypted Storage

If OS credential managers aren't available, the system automatically falls back to AES-256 encrypted local storage:

- Creates `~/.jira-mcp-secure/` directory
- Generates secure master key
- Stores encrypted credentials
- Uses random IVs for each encryption

## 🧪 Testing Your Setup

After configuration, test with Claude:

1. **Check Configuration**:
   > "Show me my current Jira configuration"

2. **Test Connection**:
   > "Test my Jira connection"

3. **Create a Test Ticket**:
   > "Create a test Jira ticket to verify everything is working"

## 🛡 Security Best Practices

1. **Use the Secure CLI Tool**:
   - Never configure API tokens through conversation
   - Always use: `npx @techrivers/atlassianjira-mcp-integration --configure`

2. **Regular Token Rotation**:
   - Rotate API tokens periodically
   - Update using the secure CLI tool

3. **Monitor Access**:
   - Check Jira audit logs for API usage
   - Review token permissions in Atlassian admin

4. **Secure Environment**:
   - Keep your system updated
   - Use strong system passwords
   - Enable system encryption (FileVault, BitLocker, etc.)

## 📞 Support

If you encounter issues:

1. Check the [GitHub Issues](https://github.com/techrivers/AtlassianJira-MCP-Integration/issues)
2. Run diagnostics: `npx @techrivers/atlassianjira-mcp-integration --configure`
3. Review Claude Desktop logs
4. Test with minimal configuration

## 🔄 Migration from Legacy Setup

If you have an existing `~/.jira-mcp.env` file:

1. Run the secure configuration tool:
   ```bash
   npx @techrivers/atlassianjira-mcp-integration --configure
   ```

2. The tool will detect existing configuration and offer to upgrade

3. Your credentials will be migrated to secure storage

4. The legacy file can be safely deleted after migration

---

**Security Note**: This integration prioritizes security above all else. Your Jira API tokens are treated as highly sensitive credentials and are protected using multiple layers of security. They are never exposed to AI systems or stored in plain text.