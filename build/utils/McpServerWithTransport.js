"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpServerWithTransport = void 0;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
class McpServerWithTransport extends mcp_js_1.McpServer {
    transport;
    constructor(serverInfo, options) {
        super(serverInfo, options);
    }
    connect(transport) {
        this.transport = transport;
        return super.connect(transport);
    }
}
exports.McpServerWithTransport = McpServerWithTransport;
