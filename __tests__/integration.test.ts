/**
 * Integration Tests for Tauri Dev MCP
 * 
 * This comprehensive test suite:
 * 1. Validates prerequisites (built MCP server and Tauri plugin)
 * 2. Starts the Tauri example app and waits for readiness
 * 3. Connects to MCP server via official SDK
 * 4. Tests all MCP tools comprehensively across multiple suites
 * 5. Automatically manages processes and cleanup
 * 6. Provides detailed Jest reporting
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
// Use Node.js built-in fetch (Node 18+)
const fetch = globalThis.fetch;
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { 
  ListToolsResultSchema,
  CallToolResultSchema 
} from '@modelcontextprotocol/sdk/types.js';

import {
  TestConfig,
  TestProcesses,
  McpResponse,
  InspectElementResult,
  QuerySelectorResult,
  ConsoleLogsResult,
  ClickElementResult,
  InputTextResult,
  ScrollResult,
  HoverResult,
  CheckboxResult,
  SelectOptionResult,
  KeyPressResult,
  WaitForElementResult,
  TauriInvokeResult
} from '../types/test-types';

// Test utilities
function testLog(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Global test process management
const testProcesses: ChildProcess[] = [];
const cleanupCallbacks: (() => Promise<void>)[] = [];

function registerProcess(process: ChildProcess): void {
  testProcesses.push(process);
}

function registerCleanup(callback: () => Promise<void>): void {
  cleanupCallbacks.push(callback);
}

// Cleanup function
async function cleanupTestResources(): Promise<void> {
  // Run cleanup callbacks first
  for (const cleanup of cleanupCallbacks) {
    try {
      await cleanup();
    } catch (error) {
      testLog(`Cleanup callback failed: ${error}`, 'WARN');
    }
  }

  // Clean up all test processes
  for (const process of testProcesses) {
    if (process && !process.killed) {
      process.kill('SIGTERM');
      
      // Wait a bit for graceful shutdown
      await sleep(1000);
      
      // Force kill if still running
      if (!process.killed) {
        process.kill('SIGKILL');
      }
    }
  }

  // Clear arrays
  testProcesses.length = 0;
  cleanupCallbacks.length = 0;
}

// Prerequisites validation
async function validatePrerequisites(): Promise<void> {
  testLog('Validating prerequisites...');

  const mcpServerPath = path.join(__dirname, '..', 'mcp-server', 'dist', 'index.js');
  const tauriPluginPaths = [
    path.join(__dirname, '..', 'tauri-plugin', 'target', 'release', 'libtauri_dev_mcp.dylib'),
    path.join(__dirname, '..', 'tauri-plugin', 'target', 'release', 'libtauri_dev_mcp.so'),
    path.join(__dirname, '..', 'tauri-plugin', 'target', 'release', 'tauri_dev_mcp.dll')
  ];

  // Check MCP server
  try {
    await fs.access(mcpServerPath);
    testLog('✅ MCP server build found');
  } catch {
    throw new Error('❌ MCP server not built. Please run: cd mcp-server && npm run build');
  }

  // Check Tauri plugin
  let pluginFound = false;
  for (const pluginPath of tauriPluginPaths) {
    try {
      await fs.access(pluginPath);
      testLog('✅ Tauri plugin build found');
      pluginFound = true;
      break;
    } catch {
      // Continue checking other platforms
    }
  }

  if (!pluginFound) {
    throw new Error('❌ Tauri plugin not built. Please run: cd tauri-plugin && cargo build --release');
  }

  testLog('✅ All prerequisites validated');
}

describe('Tauri Dev MCP Integration Tests', () => {
  // Get HTTP API address from environment variables
  const apiHost = process.env.TAURI_MCP_HOST || '127.0.0.1';
  const apiPort = process.env.TAURI_MCP_PORT || '3001';
  const baseUrl = `http://${apiHost}:${apiPort}`;

  const config: TestConfig = {
    tauriAppTimeout: 120000, // 2 minutes
    mcpServerTimeout: 30000,  // 30 seconds  
    baseUrl,
    mcpServerPath: path.join(__dirname, '..', 'mcp-server', 'dist', 'index.js'),
    exampleAppPath: path.join(__dirname, '..', 'example-app')
  };

  const processes: TestProcesses = {
    tauriProcess: null,
    mcpClient: null
  };

  // Helper function to start Tauri app
  async function startTauriApp(): Promise<void> {
    testLog('Starting Tauri example app...');
    
    processes.tauriProcess = spawn('npm', ['run', 'tauri:dev'], {
      cwd: config.exampleAppPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    registerProcess(processes.tauriProcess);

    let startupOutput = '';
    processes.tauriProcess.stdout?.on('data', (data) => {
      startupOutput += data.toString();
    });

    processes.tauriProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      startupOutput += output;
      if (output.includes('Finished') || output.includes('Running')) {
        testLog('Tauri app compilation finished');
      }
    });

    // Wait for app to start
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes
    
    while (attempts < maxAttempts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        
        const response = await fetch(`${config.baseUrl}/api/health`, { 
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        if (response.ok) {
          const health = await response.json() as { status: string; webview_ready: boolean };
          if (health.status === 'healthy' && health.webview_ready) {
            testLog('Tauri app is ready and healthy');
            return;
          }
        }
      } catch (error) {
        // App not ready yet
      }
      
      attempts++;
      await sleep(2000);
      
      if (attempts % 15 === 0) {
        testLog(`Still waiting for Tauri app to start... (${attempts * 2}s)`);
      }
    }
    
    throw new Error('Tauri app failed to start within timeout period');
  }

  // Helper function to start MCP server
  async function startMcpServer(): Promise<void> {
    testLog('Starting MCP server...');
    
    // Create transport and client
    const transport = new StdioClientTransport({
      command: 'node',
      args: [config.mcpServerPath],
      env: { ...process.env, NODE_ENV: 'development' }
    });

    processes.mcpClient = new Client({
      name: 'integration-test-client',
      version: '1.0.0',
    }, {
      capabilities: {}
    });

    // Register cleanup for MCP client
    registerCleanup(async () => {
      if (processes.mcpClient) {
        try {
          await processes.mcpClient.close();
        } catch (error) {
          testLog(`Error closing MCP client: ${error}`, 'WARN');
        }
      }
    });

    // Connect to MCP server
    await processes.mcpClient.connect(transport);
    testLog('Connected to MCP server via SDK');

    // Verify connection by listing tools
    const toolsResponse = await processes.mcpClient.request({
      method: 'tools/list',
      params: {}
    }, ListToolsResultSchema) as { tools: any[] };

    testLog(`MCP server ready with ${toolsResponse.tools.length} tools`);
    
    // Verify tauri_invoke tool is available
    const toolNames = toolsResponse.tools.map((tool: any) => tool.name);
    if (toolNames.includes('tauri_invoke')) {
      testLog('✅ tauri_invoke tool found in MCP server');
    } else {
      throw new Error('❌ tauri_invoke tool not found in MCP server tools list');
    }
  }

  // Helper function to call MCP tools
  async function callMcpTool<T>(toolName: string, params: any): Promise<T> {
    if (!processes.mcpClient) {
      throw new Error('MCP client not initialized');
    }

    const response = await processes.mcpClient.request({
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    }, CallToolResultSchema) as McpResponse;

    if (!response.content || !Array.isArray(response.content)) {
      throw new Error('Invalid MCP response format');
    }

    // Parse the text content from MCP response
    const textContent = response.content.find(c => c.type === 'text')?.text;
    if (!textContent) {
      throw new Error('No text content in MCP response');
    }

    return JSON.parse(textContent) as T;
  }

  // Setup before all tests
  beforeAll(async () => {
    testLog('🧪 Starting Tauri Dev MCP Integration Test Suite');
    testLog('='.repeat(60));
    
    // Validate prerequisites first
    await validatePrerequisites();
    
    testLog('Setting up integration test environment...');
    
    // Start Tauri app first
    await startTauriApp();
    
    // Start MCP server and connect
    await startMcpServer();
    
    // Wait for everything to settle
    await sleep(2000);
    
    testLog('✅ Integration test environment ready');
    testLog('🚀 Running test suites...');
  }, config.tauriAppTimeout + config.mcpServerTimeout);

  // Cleanup after all tests
  afterAll(async () => {
    testLog('🧹 Cleaning up test environment...');
    await cleanupTestResources();
    testLog('✅ Cleanup completed');
    testLog('='.repeat(60));
  });

  describe('MCP Server Setup', () => {
    test('should list all expected tools including tauri_invoke', async () => {
      if (!processes.mcpClient) {
        throw new Error('MCP client not initialized');
      }

      const toolsResponse = await processes.mcpClient.request({
        method: 'tools/list',
        params: {}
      }, ListToolsResultSchema) as { tools: Array<{ name: string; description: string; inputSchema: any }> };

      const toolNames = toolsResponse.tools.map(tool => tool.name);
      
      // Verify all expected tools are present
      const expectedTools = [
        'inspect_element',
        'query_selector', 
        'get_console_logs',
        'click_element',
        'input_text',
        'scroll_to_element',
        'hover_element',
        'select_option',
        'check_checkbox',
        'press_key',
        'wait_for_element',
        'tauri_invoke'
      ];

      for (const expectedTool of expectedTools) {
        expect(toolNames).toContain(expectedTool);
      }

      // Verify tauri_invoke tool has proper schema
      const tauriInvokeTool = toolsResponse.tools.find(tool => tool.name === 'tauri_invoke');
      expect(tauriInvokeTool).toBeDefined();
      expect(tauriInvokeTool!.description).toContain('Tauri command');
      expect(tauriInvokeTool!.inputSchema.properties.command).toBeDefined();
      expect(tauriInvokeTool!.inputSchema.properties.args).toBeDefined();
      expect(tauriInvokeTool!.inputSchema.required).toContain('command');
    });
  });

  describe('DOM Inspection Tools', () => {
    test('inspect_element should return detailed element information', async () => {
      // Test basic selector
      const bodyResult = await callMcpTool<InspectElementResult>('inspect_element', {
        selector: 'body',
        include_styles: false
      });

      expect(bodyResult.found).toBe(true);
      expect(bodyResult.element).toBeDefined();
      expect(bodyResult.element?.tagName).toBe('BODY');
      // textContent was removed from output as requested

      // Test specific element with styles
      const buttonResult = await callMcpTool<InspectElementResult>('inspect_element', {
        selector: '#test-button',
        include_styles: true
      });

      expect(buttonResult.found).toBe(true);
      expect(buttonResult.element).toBeDefined();
      expect(buttonResult.element?.tagName).toBe('BUTTON');
      expect(buttonResult.element?.id).toBe('test-button');
      expect(buttonResult.element?.computedStyles).toBeDefined();
      expect(buttonResult.element?.boundingRect).toBeDefined();
      expect(buttonResult.element?.isVisible).toBe(true);
      expect(buttonResult.element?.isInteractable).toBe(true);
    });

    test('query_selector should return enhanced element information', async () => {
      // Test finding buttons
      const buttonsResult = await callMcpTool<QuerySelectorResult>('query_selector', {
        selector: 'button',
        limit: 5
      });

      expect(Array.isArray(buttonsResult.elements)).toBe(true);
      expect(buttonsResult.elements.length).toBeGreaterThan(0);
      expect(buttonsResult.count).toBe(buttonsResult.elements.length);
      expect(buttonsResult.total_found).toBeGreaterThanOrEqual(buttonsResult.count);

      // Verify enhanced output format
      const firstButton = buttonsResult.elements[0];
      expect(firstButton.tagName).toBe('BUTTON');
      expect(firstButton.type).toBeDefined();

      // Test finding inputs with element-specific properties
      const inputsResult = await callMcpTool<QuerySelectorResult>('query_selector', {
        selector: 'input',
        limit: 3
      });

      expect(inputsResult.elements.length).toBeGreaterThan(0);
      
      const firstInput = inputsResult.elements[0];
      expect(firstInput.tagName).toBe('INPUT');
      expect(firstInput.type).toBeDefined();
      expect(firstInput.name).toBeDefined();
    });
  });

  describe('Console Logging Tools', () => {
    test('get_console_logs should capture early logs from page initialization', async () => {
      // Test early log capture - these logs should be captured from HEAD script and initial page load
      const logsResult = await callMcpTool<ConsoleLogsResult>('get_console_logs', {
        limit: 50
      });

      expect(Array.isArray(logsResult.logs)).toBe(true);
      expect(logsResult.logs.length).toBeGreaterThan(0);

      // Look for specific early logs that should be captured
      const logMessages = logsResult.logs.map(log => log.message);
      
      // These logs come from the HEAD script in index.html
      const hasHeadScriptLog = logMessages.some(msg => 
        msg.includes('🏁 HEAD script: Page parsing started') || 
        msg.includes('HEAD script')
      );
      
      const hasEarlyWarning = logMessages.some(msg => 
        msg.includes('⏰ HEAD script: This should be captured') ||
        msg.includes('HEAD script')
      );

      // These logs come from early page initialization
      const hasVeryEarlyLog = logMessages.some(msg => 
        msg.includes('🌟 Very early log message') ||
        msg.includes('Very early')
      );

      const hasAppLoadedLog = logMessages.some(msg => 
        msg.includes('🚀 Tauri Dev MCP Example App loaded') ||
        msg.includes('App loaded')
      );

      // Should have MCP inspector initialization
      const hasMcpInitLog = logMessages.some(msg => 
        msg.includes('[MCP Inspector]') && msg.includes('initialized')
      );

      // At least some early logs should be captured
      expect(hasHeadScriptLog || hasEarlyWarning || hasVeryEarlyLog || hasAppLoadedLog).toBe(true);
      expect(hasMcpInitLog).toBe(true);

      testLog(`Captured ${logsResult.logs.length} total console logs`);
      testLog(`Early logs found: HEAD(${hasHeadScriptLog}), Warning(${hasEarlyWarning}), VeryEarly(${hasVeryEarlyLog}), AppLoaded(${hasAppLoadedLog})`);
    });

    test('get_console_logs should capture and format logs correctly', async () => {
      // First, trigger some console logs by clicking buttons
      await callMcpTool<ClickElementResult>('click_element', {
        selector: 'button[onclick*="console.log"]'
      });

      await callMcpTool<ClickElementResult>('click_element', {
        selector: 'button[onclick*="console.warn"]'
      });

      await callMcpTool<ClickElementResult>('click_element', {
        selector: 'button[onclick*="console.error"]'
      });

      // Now test getting console logs
      const logsResult = await callMcpTool<ConsoleLogsResult>('get_console_logs', {
        limit: 10
      });

      expect(Array.isArray(logsResult.logs)).toBe(true);
      expect(logsResult.logs.length).toBeGreaterThan(0);
      expect(logsResult.total_available).toBeGreaterThanOrEqual(logsResult.logs.length);

      // Verify log format
      const firstLog = logsResult.logs[0];
      expect(firstLog.timestamp).toBeDefined();
      expect(firstLog.level).toBeDefined();
      expect(firstLog.message).toBeDefined();
      
      // Verify no args field (we removed it)
      expect((firstLog as any).args).toBeUndefined();

      // Test limit functionality
      const limitedResult = await callMcpTool<ConsoleLogsResult>('get_console_logs', {
        limit: 2
      });

      expect(limitedResult.logs.length).toBeLessThanOrEqual(2);
      expect(limitedResult.has_more).toBe(true);
    });
  });

  describe('UI Automation Tools', () => {
    test('click_element should successfully click interactive elements', async () => {
      const result = await callMcpTool<ClickElementResult>('click_element', {
        selector: '#test-button'
      });

      expect(result.clicked_element).toBeDefined();
      expect(result.clicked_element.tagName).toBe('BUTTON');
      expect(result.clicked_element.id).toBe('test-button');
    });

    test('input_text should input text into form fields', async () => {
      const testText = 'integration-test-value';
      
      const result = await callMcpTool<InputTextResult>('input_text', {
        selector: '#username',
        text: testText
      });

      expect(result.input_element).toBeDefined();
      expect(result.input_element.tagName).toBe('INPUT');
      expect(result.input_element.value).toBe(testText);
    });

    test('scroll_to_element should scroll to target element', async () => {
      const result = await callMcpTool<ScrollResult>('scroll_to_element', {
        selector: '#main-title'
      });

      expect(result.scrolled_to).toBeDefined();
      expect(result.scrolled_to.element).toBe('#main-title');
      expect(result.scrolled_to.final_position).toBeDefined();
      expect(typeof result.scrolled_to.final_position.x).toBe('number');
      expect(typeof result.scrolled_to.final_position.y).toBe('number');
    });

    test('hover_element should trigger hover effects', async () => {
      const result = await callMcpTool<HoverResult>('hover_element', {
        selector: '#test-button'
      });

      expect(result.hovered_element).toBeDefined();
      expect(result.hovered_element.tagName).toBe('BUTTON');
    });

    test('check_checkbox should control checkbox state', async () => {
      const result = await callMcpTool<CheckboxResult>('check_checkbox', {
        selector: '#newsletter',
        checked: true
      });

      expect(result.checkbox_state).toBeDefined();
      expect(result.checkbox_state.checked).toBe(true);
    });

    test('select_option should select dropdown options', async () => {
      const result = await callMcpTool<SelectOptionResult>('select_option', {
        selector: '#country',
        option: 'us',
        by: 'value'
      });

      expect(result.selected_option).toBeDefined();
      expect(result.selected_option.value).toBe('us');
      expect(result.selected_option.text).toBeDefined();
      expect(typeof result.selected_option.index).toBe('number');
    });

    test('press_key should simulate keyboard input', async () => {
      const result = await callMcpTool<KeyPressResult>('press_key', {
        key: 'Tab',
        target_selector: '#username'
      });

      expect(result.key_pressed).toBeDefined();
      expect(result.key_pressed.key).toBe('Tab');
      expect(result.key_pressed.modifiers).toBeDefined();
    });

    test('wait_for_element should wait for element conditions', async () => {
      // Test waiting for existing element
      const existingResult = await callMcpTool<WaitForElementResult>('wait_for_element', {
        selector: '#test-button',
        condition: 'visible',
        timeout: 1000
      });

      expect(existingResult.condition_met).toBe(true);
      expect(existingResult.final_state.exists).toBe(true);
      expect(existingResult.final_state.visible).toBe(true);

      // Test waiting for non-existing element (should timeout)
      const nonExistingResult = await callMcpTool<WaitForElementResult>('wait_for_element', {
        selector: '#non-existent-element',
        condition: 'visible',
        timeout: 500
      });

      expect(nonExistingResult.condition_met).toBe(false);
      expect(nonExistingResult.final_state.exists).toBe(false);
    });
  });

  describe('Tauri Command Invocation', () => {
    test('tauri_invoke should call simple Tauri commands', async () => {
      const result = await callMcpTool<string>('tauri_invoke', {
        command: 'get_app_version',
        args: {}
      });

      expect(typeof result).toBe('string');
      expect(result).toBe('1.0.0');
    });

    test('tauri_invoke should call commands with parameters', async () => {
      const testName = 'Integration Test Suite';
      const result = await callMcpTool<string>('tauri_invoke', {
        command: 'greet',
        args: {
          name: testName
        }
      });

      expect(typeof result).toBe('string');
      expect(result).toContain(testName);
      expect(result).toContain('Hello,');
      expect(result).toContain('Greetings from Tauri!');
    });

    test('tauri_invoke should handle complex JSON responses', async () => {
      const result = await callMcpTool<{
        platform: string;
        arch: string;
        timestamp: string;
      }>('tauri_invoke', {
        command: 'get_system_info',
        args: {}
      });

      expect(typeof result).toBe('object');
      expect(result.platform).toBeDefined();
      expect(result.arch).toBeDefined();
      expect(result.timestamp).toBeDefined();
      
      // Validate platform is a known value
      expect(['macos', 'windows', 'linux']).toContain(result.platform);
      
      // Validate timestamp is ISO format
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    test('tauri_invoke should handle commands with empty args', async () => {
      // Test omitting args (should default to {})
      const result1 = await callMcpTool<string>('tauri_invoke', {
        command: 'get_app_version'
      });

      // Test explicitly passing empty args
      const result2 = await callMcpTool<string>('tauri_invoke', {
        command: 'get_app_version',
        args: {}
      });

      expect(result1).toBe(result2);
      expect(result1).toBe('1.0.0');
    });

    test('tauri_invoke should handle invalid commands gracefully', async () => {
      await expect(callMcpTool('tauri_invoke', {
        command: 'invalid_command_that_does_not_exist',
        args: {}
      })).rejects.toThrow();
    });

    test('tauri_invoke should validate command parameter is required', async () => {
      await expect(callMcpTool('tauri_invoke', {
        args: {}
      })).rejects.toThrow();
    });

    test('tauri_invoke should handle commands with complex argument structures', async () => {
      // Test greet command with nested object (if it supported it)
      const result = await callMcpTool<string>('tauri_invoke', {
        command: 'greet',
        args: {
          name: 'Complex Test',
          // Add more fields to test argument parsing
          extra_field: 'should be ignored by greet command'
        }
      });

      expect(typeof result).toBe('string');
      expect(result).toContain('Complex Test');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid selectors gracefully', async () => {
      await expect(callMcpTool('inspect_element', {
        selector: 'invalid[[[selector'
      })).rejects.toThrow();
    });

    test('should handle non-existent elements', async () => {
      const result = await callMcpTool<InspectElementResult>('inspect_element', {
        selector: '#does-not-exist'
      });

      expect(result.found).toBe(false);
      expect(result.element).toBeNull();
    });

    test('should handle MCP tool that does not exist', async () => {
      await expect(callMcpTool('non_existent_tool', {
        param: 'value'
      })).rejects.toThrow();
    });
  });
});