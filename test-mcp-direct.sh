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

echo ""
echo "Test 3: Call tauri_invoke (get_app_version)"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"tauri_invoke","arguments":{"command":"get_app_version","args":{}}},"id":3}' | node dist/index.js 2>&1

echo ""
echo "Test 4: Call tauri_invoke (greet with parameters)"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"tauri_invoke","arguments":{"command":"greet","args":{"name":"MCP Direct Test"}}},"id":4}' | node dist/index.js 2>&1

echo ""
echo "Test 5: Call tauri_invoke (get_system_info - complex JSON)"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"tauri_invoke","arguments":{"command":"get_system_info","args":{}}},"id":5}' | node dist/index.js 2>&1

echo ""
echo "Test 6: Call tauri_invoke (invalid command - error handling)"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"tauri_invoke","arguments":{"command":"invalid_command","args":{}}},"id":6}' | node dist/index.js 2>&1