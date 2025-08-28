# MCP Compliance Documentation

This document details the changes made to make the Jira MCP server fully compliant with MCP standards and deployable via NPX.

## Issues Fixed

### 1. **Removed Dependency on Config-UI Directory**
- **Problem**: Server required `config-ui` directory to exist for NPX deployments
- **Solution**: Added `MCP_MODE` and `SKIP_UI_SETUP` environment variables to bypass UI setup
- **Files Modified**: 
  - `src/index.ts` - Added MCP mode checks
  - `src/utils/setupUtilities.ts` - Skip UI setup in MCP mode

### 2. **Eliminated process.exit(1) Calls**
- **Problem**: Server killed itself with `process.exit(1)` on configuration errors
- **Solution**: Added graceful fallbacks to start MCP server even without configuration
- **Files Modified**: 
  - `src/index.ts` - Replaced `process.exit(1)` with conditional server startup
  - Error handlers now continue in MCP mode instead of exiting

### 3. **Removed Localhost Web Server Requirements**
- **Problem**: Server attempted to start web servers on ports 3000/5000
- **Solution**: Skip web server startup when `MCP_MODE=true`
- **Files Modified**:
  - `src/utils/setupUtilities.ts` - Skip port checks and UI startup in MCP mode

### 4. **Added Environment Variable Support**
- **Problem**: Server only supported file-based configuration
- **Solution**: Enhanced to prioritize environment variables over file configuration
- **Files Modified**:
  - `src/utils/configManager.ts` - Environment variables take precedence
  - `src/index.ts` - Load environment configuration first

## Environment Variables

### Required for MCP Mode
- `MCP_MODE=true` - Enables MCP-compliant behavior
- `JIRA_URL` - Jira instance URL
- `JIRA_USERNAME` - Jira username/email
- `JIRA_API_TOKEN` - Jira API token

### Optional
- `SKIP_UI_SETUP=true` - Alternative to MCP_MODE for skipping UI
- `JIRA_PROJECT_KEY` - Default project key
- `JIRA_DEFAULT_ASSIGNEE` - Default assignee email
- `JIRA_DEFAULT_PRIORITY` - Default priority level

## MCP Configuration Example

```json
{
  "mcpServers": {
    "Jira Integration MCP": {
      "command": "npx",
      "args": ["-y", "github:techrivers/AtlassianJira-MCP-Integration"],
      "env": {
        "JIRA_URL": "https://company.atlassian.net",
        "JIRA_USERNAME": "user@company.com",
        "JIRA_API_TOKEN": "token",
        "MCP_MODE": "true"
      }
    }
  }
}
```

## Behavior Changes in MCP Mode

### Startup Behavior
- **Before**: Required config-ui directory and user interaction
- **After**: Starts immediately with environment variables or graceful fallback

### Error Handling
- **Before**: `process.exit(1)` on any configuration error
- **After**: Logs errors and continues with MCP server startup

### Configuration Management
- **Before**: File-based configuration only
- **After**: Environment variables take precedence, file operations skipped in MCP mode

### Setup Process
- **Before**: Opens browser UI for configuration
- **After**: Uses environment variables or starts with minimal configuration

## Backwards Compatibility

The server maintains full backwards compatibility:
- Works normally without `MCP_MODE` set
- Configuration UI still available in non-MCP mode
- File-based configuration still supported
- All existing tools and functionality preserved

## Testing MCP Compliance

### Test 1: NPX Deployment
```bash
# Should start successfully without config-ui directory
npx -y github:techrivers/AtlassianJira-MCP-Integration
```

### Test 2: Environment Variable Configuration
```bash
export JIRA_URL="https://test.atlassian.net"
export JIRA_USERNAME="test@example.com"
export JIRA_API_TOKEN="test-token"
export MCP_MODE="true"
npx -y github:techrivers/AtlassianJira-MCP-Integration
```

### Test 3: Graceful Fallback
```bash
# Should start MCP server even without configuration
export MCP_MODE="true"
npx -y github:techrivers/AtlassianJira-MCP-Integration
```

## File Changes Summary

### src/index.ts
- Added MCP mode checks for Node.js version compatibility
- Skip UI setup in MCP mode
- Environment variable configuration priority
- Graceful fallbacks instead of process.exit(1)
- Enhanced error handling for MCP compliance

### src/utils/setupUtilities.ts
- Skip UI startup in MCP mode
- Enhanced fallback instructions for MCP mode
- Environment variable configuration documentation

### src/utils/configManager.ts
- Skip file operations in MCP mode
- Environment variable precedence
- MCP-aware configuration warnings

## Benefits of MCP Compliance

1. **Easy Deployment**: Works instantly via NPX without setup
2. **No Local Dependencies**: No need for config-ui directory
3. **Claude Desktop Compatible**: Proper stdio transport communication
4. **Environment-Based Config**: Standard MCP configuration pattern
5. **Graceful Error Handling**: Server stays running for configuration tools
6. **Cross-Platform**: Works reliably across different environments