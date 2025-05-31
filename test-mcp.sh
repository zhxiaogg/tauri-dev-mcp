#!/bin/bash

# Test the MCP server with debug output
cd /Users/xiaoguang/work/repos/bloomstack/browser_mcp_project/tauri-dev-mcp/mcp-server

echo "Testing MCP server with debug logging..."
echo "Make sure your Tauri app is running first!"
echo ""

# Run the MCP server with debug output visible
NODE_ENV=development node dist/index.js 2>&1 | tee mcp-debug.log