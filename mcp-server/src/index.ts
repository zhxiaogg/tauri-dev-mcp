#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TauriHttpClient } from './utils/http-client.js';
import { handleTauriError, validateSelector } from './utils/error-handler.js';
import {
  InspectElementInputSchema,
  QuerySelectorInputSchema,
  GetConsoleLogsInputSchema,
  ClickElementInputSchema,
  InputTextInputSchema,
  ScrollToElementInputSchema,
  HoverElementInputSchema,
  SelectOptionInputSchema,
  CheckCheckboxInputSchema,
  PressKeyInputSchema,
  WaitForElementInputSchema,
} from './types/index.js';

const SERVER_NAME = 'tauri-dev-mcp-server';
const SERVER_VERSION = '1.0.0';

class TauriDevMcpServer {
  private server: Server;
  private httpClient: TauriHttpClient;

  constructor() {
    this.server = new Server(
      {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.httpClient = new TauriHttpClient();
    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    // Handle tools/list request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.debug('[MCP Server] Handling tools/list request');
      return {
        tools: [
          {
            name: 'inspect_element',
            description: 'Get detailed information about a specific DOM element (returns first match). Use when you need comprehensive details about ONE specific element, including styles, attributes, and properties.',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector (returns first matching element)'
                },
                include_styles: {
                  type: 'boolean',
                  description: 'Include computed styles',
                  default: true
                }
              },
              required: ['selector']
            },
          },
          {
            name: 'query_selector',
            description: 'Find multiple elements matching a selector (returns array of matches). Use when you need to find MULTIPLE elements or get a list/overview of elements. Returns basic info without detailed styles.',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector (returns all matching elements)'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum elements to return',
                  default: 10
                }
              },
              required: ['selector']
            },
          },
          {
            name: 'get_console_logs',
            description: 'Retrieve the latest N console messages from the webview (snapshot, not streaming). Returns console logs sorted by most recent first (newest → oldest).',
            inputSchema: {
              type: 'object',
              properties: {
                level: {
                  type: 'string',
                  enum: ['log', 'warn', 'error', 'info', 'debug', 'all'],
                  description: 'Filter by log level',
                  default: 'all'
                },
                limit: {
                  type: 'number',
                  description: 'Number of latest logs to return (most recent first)',
                  default: 50,
                  maximum: 1000
                },
                clear_after: {
                  type: 'boolean',
                  description: 'Clear the console buffer after retrieving logs',
                  default: false
                }
              },
              required: []
            },
          },
          {
            name: 'click_element',
            description: 'Perform a click action on an element by CSS selector. Supports left, right, and double clicks.',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector'
                },
                click_type: {
                  type: 'string',
                  enum: ['left', 'right', 'double'],
                  description: 'Type of click to perform',
                  default: 'left'
                },
                wait_timeout: {
                  type: 'number',
                  description: 'Wait timeout for element to be clickable (ms)',
                  default: 5000
                }
              },
              required: ['selector']
            },
          },
          {
            name: 'input_text',
            description: 'Input text into form elements (input, textarea, contenteditable) by CSS selector. Optionally clears existing text first.',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector'
                },
                text: {
                  type: 'string',
                  description: 'Text to input'
                },
                clear_first: {
                  type: 'boolean',
                  description: 'Clear existing text before typing',
                  default: true
                },
                trigger_events: {
                  type: 'boolean',
                  description: 'Trigger input/change events for validation',
                  default: true
                }
              },
              required: ['selector', 'text']
            },
          },
          {
            name: 'scroll_to_element',
            description: 'Scroll the page to bring an element into view. Supports smooth or instant scrolling with various alignment options.',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector'
                },
                behavior: {
                  type: 'string',
                  enum: ['smooth', 'auto'],
                  description: 'Scrolling behavior',
                  default: 'smooth'
                },
                block: {
                  type: 'string',
                  enum: ['start', 'center', 'end', 'nearest'],
                  description: 'Vertical alignment',
                  default: 'center'
                }
              },
              required: ['selector']
            },
          },
          {
            name: 'hover_element',
            description: 'Hover over an element to trigger hover states, dropdown menus, or tooltips.',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector'
                }
              },
              required: ['selector']
            },
          },
          {
            name: 'select_option',
            description: 'Select an option from a dropdown/select element. Can select by value, text content, or index.',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector for the select element'
                },
                option: {
                  type: 'string',
                  description: 'Option to select (by value, text, or index)'
                },
                by: {
                  type: 'string',
                  enum: ['value', 'text', 'index'],
                  description: 'How to identify the option',
                  default: 'value'
                }
              },
              required: ['selector', 'option']
            },
          },
          {
            name: 'check_checkbox',
            description: 'Check or uncheck a checkbox or radio button. Can set the checked state explicitly.',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector for checkbox/radio'
                },
                checked: {
                  type: 'boolean',
                  description: 'Whether to check (true) or uncheck (false)',
                  default: true
                }
              },
              required: ['selector']
            },
          },
          {
            name: 'press_key',
            description: 'Send keyboard input (Enter, Tab, Escape, etc.) with optional modifier keys. Can target a specific element.',
            inputSchema: {
              type: 'object',
              properties: {
                key: {
                  type: 'string',
                  description: 'Key to press (KeyboardEvent.key values)'
                },
                target_selector: {
                  type: 'string',
                  description: 'Optional: target element selector (focuses first)'
                },
                modifiers: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['ctrl', 'shift', 'alt', 'meta']
                  },
                  description: 'Modifier keys to hold',
                  default: []
                }
              },
              required: ['key']
            },
          },
          {
            name: 'wait_for_element',
            description: 'Wait for an element to appear, disappear, or change state. Useful for handling dynamic content and ensuring elements are ready for interaction.',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector to wait for'
                },
                condition: {
                  type: 'string',
                  enum: ['visible', 'hidden', 'exists', 'not_exists', 'clickable'],
                  description: 'Condition to wait for',
                  default: 'visible'
                },
                timeout: {
                  type: 'number',
                  description: 'Maximum wait time in milliseconds',
                  default: 10000
                }
              },
              required: ['selector']
            },
          },
        ],
      };
    });

    // Handle tools/call request
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      console.debug('[MCP Server] Handling tool call:', name, 'with args:', args);

      try {
        switch (name) {
          case 'inspect_element': {
            const input = InspectElementInputSchema.parse(args);
            validateSelector(input.selector);
            const response = await this.httpClient.execute('inspect_element', input);
            if (!response.success) throw response.error;
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'query_selector': {
            const input = QuerySelectorInputSchema.parse(args);
            validateSelector(input.selector);
            const response = await this.httpClient.execute('query_selector', input);
            if (!response.success) throw response.error;
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'get_console_logs': {
            const input = GetConsoleLogsInputSchema.parse(args);
            const response = await this.httpClient.execute('get_console_logs', input);
            if (!response.success) throw response.error;
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'click_element': {
            const input = ClickElementInputSchema.parse(args);
            validateSelector(input.selector);
            const response = await this.httpClient.execute('click_element', input);
            if (!response.success) throw response.error;
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'input_text': {
            const input = InputTextInputSchema.parse(args);
            validateSelector(input.selector);
            const response = await this.httpClient.execute('input_text', input);
            if (!response.success) throw response.error;
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'scroll_to_element': {
            const input = ScrollToElementInputSchema.parse(args);
            validateSelector(input.selector);
            const response = await this.httpClient.execute('scroll_to_element', input);
            if (!response.success) throw response.error;
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'hover_element': {
            const input = HoverElementInputSchema.parse(args);
            validateSelector(input.selector);
            const response = await this.httpClient.execute('hover_element', input);
            if (!response.success) throw response.error;
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'select_option': {
            const input = SelectOptionInputSchema.parse(args);
            validateSelector(input.selector);
            const response = await this.httpClient.execute('select_option', input);
            if (!response.success) throw response.error;
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'check_checkbox': {
            const input = CheckCheckboxInputSchema.parse(args);
            validateSelector(input.selector);
            const response = await this.httpClient.execute('check_checkbox', input);
            if (!response.success) throw response.error;
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'press_key': {
            const input = PressKeyInputSchema.parse(args);
            if (input.target_selector) validateSelector(input.target_selector);
            const response = await this.httpClient.execute('press_key', input);
            if (!response.success) throw response.error;
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          case 'wait_for_element': {
            const input = WaitForElementInputSchema.parse(args);
            validateSelector(input.selector);
            const response = await this.httpClient.execute('wait_for_element', input);
            if (!response.success) throw response.error;
            return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.debug('[MCP Server] Tool execution error:', error);
        const mcpError = handleTauriError(error);
        throw new McpError(
          ErrorCode.InternalError,
          mcpError.message,
          { originalError: error }
        );
      }
    });
  }

  private setupErrorHandling(): void {
    // Handle server errors
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    // Handle process errors
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.server.close();
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      console.error('[Uncaught Exception]', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Unhandled Rejection]', reason, 'at', promise);
      process.exit(1);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    
    // Optional: Check if Tauri app is running
    const isHealthy = await this.httpClient.healthCheck();
    if (!isHealthy) {
      console.error('[Warning] Could not connect to Tauri plugin. Make sure your Tauri app is running.');
      console.error('[Info] The MCP server will still start, but tools will fail until the Tauri app is available.');
    } else {
      console.error('[Info] Successfully connected to Tauri plugin.');
    }

    await this.server.connect(transport);
    console.error(`[Info] ${SERVER_NAME} v${SERVER_VERSION} started successfully.`);
  }
}

// Start the server
async function main() {
  try {
    const server = new TauriDevMcpServer();
    await server.start();
  } catch (error) {
    console.error('[Fatal Error]', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[Main Error]', error);
  process.exit(1);
});