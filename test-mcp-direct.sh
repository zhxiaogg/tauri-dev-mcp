#!/bin/bash

# Test the MCP server directly with example requests
cd /Users/xiaoguang/work/repos/bloomstack/browser_mcp_project/tauri-dev-mcp/mcp-server

echo "Testing MCP server..."
echo ""
echo "Test 1: List tools"
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | node dist/index.js 2>&1

echo ""
echo "Test 2: Call inspect_element"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"inspect_element","arguments":{"selector":"body","include_styles":false}},"id":2}' | node dist/index.js 2>&1