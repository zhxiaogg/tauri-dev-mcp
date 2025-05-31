#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testMcpServer() {
  console.log('Starting MCP test client...');
  
  const serverPath = '/Users/xiaoguang/work/repos/bloomstack/browser_mcp_project/tauri-dev-mcp/mcp-server/dist/index.js';
  
  // Spawn the MCP server process
  const serverProcess = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' }
  });

  // Capture server stderr (debug logs)
  serverProcess.stderr.on('data', (data) => {
    console.error('[Server Debug]', data.toString());
  });

  // Create transport
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: { ...process.env, NODE_ENV: 'development' }
  });

  // Create client
  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  try {
    // Connect to server
    await client.connect(transport);
    console.log('Connected to MCP server');

    // List available tools
    console.log('\n--- Listing tools ---');
    const tools = await client.request({
      method: 'tools/list',
      params: {}
    });
    console.log('Available tools:', tools.tools.map(t => t.name));

    // Test inspect_element tool
    console.log('\n--- Testing inspect_element ---');
    try {
      const result = await client.request({
        method: 'tools/call',
        params: {
          name: 'inspect_element',
          arguments: {
            selector: 'body',
            include_styles: false
          }
        }
      });
      console.log('inspect_element result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('inspect_element error:', error);
    }

    // Test get_console_logs tool
    console.log('\n--- Testing get_console_logs ---');
    try {
      const result = await client.request({
        method: 'tools/call',
        params: {
          name: 'get_console_logs',
          arguments: {
            limit: 10
          }
        }
      });
      console.log('get_console_logs result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('get_console_logs error:', error);
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Clean up
    await client.close();
    serverProcess.kill();
    process.exit(0);
  }
}

testMcpServer().catch(console.error);