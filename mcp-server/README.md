# Tauri Dev MCP Server

A Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with Tauri applications for development, testing, and automation.

## Features

- **DOM Inspection**: Inspect HTML elements, attributes, and styles
- **Console Monitoring**: Retrieve console logs and messages
- **UI Automation**: Click, type, scroll, hover, and interact with elements
- **CSS Selector Support**: Target elements using standard CSS selectors
- **Real-time Communication**: HTTP API bridge to Tauri applications

## Installation

### Prerequisites

- Node.js 18+ and npm
- A Tauri application with the `tauri-dev-mcp` plugin integrated

### Local Development

1. **Clone and Install Dependencies**
   ```bash
   cd mcp-server
   npm install
   ```

2. **Build the Server**
   ```bash
   npm run build
   ```

3. **Start the Server**
   ```bash
   npm start
   ```

The server will start and listen for MCP connections via STDIO.

### Production Build

```bash
# Build for production
npm run build

# The compiled JavaScript will be in dist/index.js
node dist/index.js
```

## Configuration

### Claude Desktop Integration

Add the MCP server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tauri-dev": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"]
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TAURI_MCP_HOST` | Tauri app HTTP host | `http://localhost:3001` |
| `TAURI_MCP_TIMEOUT` | HTTP request timeout (ms) | `5000` |
| `TAURI_MCP_RETRY_ATTEMPTS` | Failed request retry count | `3` |

Example:
```bash
export TAURI_MCP_HOST=http://localhost:3002
export TAURI_MCP_TIMEOUT=10000
npm start
```

## Usage

### Starting the Development Stack

1. **Start your Tauri application** (with the plugin integrated)
   ```bash
   cd your-tauri-app
   npm run tauri:dev
   ```

2. **Start the MCP server** (in another terminal)
   ```bash
   cd mcp-server
   npm start
   ```

3. **Open Claude Desktop** - the Tauri Dev tools will be available

### Available Tools

#### DOM Inspection

- **`inspect_element`** - Get detailed element information
  ```
  "Inspect the submit button with ID 'submit-btn'"
  ```

- **`query_selector`** - Find multiple elements
  ```
  "Find all navigation links in the header"
  ```

#### Console Monitoring

- **`get_console_logs`** - Retrieve console messages
  ```
  "Get the last 10 console log entries"
  ```

#### UI Automation

- **`click_element`** - Click on elements
  ```
  "Click the login button"
  ```

- **`input_text`** - Type into form fields
  ```
  "Enter 'user@example.com' in the email field"
  ```

- **`scroll_to_element`** - Scroll elements into view
  ```
  "Scroll to the footer section"
  ```

- **`hover_element`** - Trigger hover states
  ```
  "Hover over the dropdown menu"
  ```

- **`select_option`** - Select dropdown options
  ```
  "Select 'United States' from the country dropdown"
  ```

- **`check_checkbox`** - Toggle checkboxes
  ```
  "Check the 'Remember me' checkbox"
  ```

- **`press_key`** - Send keyboard input
  ```
  "Press Enter to submit the form"
  ```

- **`wait_for_element`** - Wait for element state changes
  ```
  "Wait for the loading spinner to disappear"
  ```

## Example Usage in Claude

Once configured, you can interact with your Tauri app through Claude:

```
"Can you inspect the main navigation menu and tell me about its structure?"

"Click the 'New Project' button and then fill out the project name field with 'My Test Project'"

"Get the latest console logs to see if there are any JavaScript errors"

"Scroll down to the footer and click the 'Contact Us' link"
```

## Development

### Project Structure

```
mcp-server/
├── src/
│   ├── index.ts          # Main MCP server implementation
│   ├── schemas.ts        # Zod validation schemas
│   └── http-client.ts    # HTTP client for Tauri communication
├── dist/                 # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts

- `npm start` - Start the MCP server
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Watch mode for development
- `npm test` - Run tests (if configured)

### Adding New Tools

1. **Define the Zod schema** in `src/types/index.ts`:
   ```typescript
   export const MyNewToolInputSchema = z.object({
     parameter: z.string().describe("Description of parameter")
   });
   ```

2. **Add the JSON Schema** in the tools list in `src/index.ts`:
   ```typescript
   {
     name: 'my_new_tool',
     description: 'Description of what the tool does',
     inputSchema: {
       type: 'object',
       properties: {
         parameter: {
           type: 'string',
           description: 'Description of parameter'
         }
       },
       required: ['parameter']
     }
   }
   ```

3. **Add the tool handler** in the switch statement:
   ```typescript
   case 'my_new_tool': {
     const input = MyNewToolInputSchema.parse(args);
     const response = await this.httpClient.execute('my_new_tool', input);
     // Handle response...
   }
   ```

**Note**: MCP requires JSON Schema format for `inputSchema` (with `type: "object"`), while we use Zod schemas for runtime validation.

### Debugging

Enable debug logging:
```bash
DEBUG=tauri-mcp:* npm start
```

Test the HTTP connection directly:
```bash
curl http://localhost:3001/api/health
```

## Troubleshooting

### Common Issues

1. **"No Tauri app found"**
   - Ensure your Tauri app is running with the plugin integrated
   - Check that the HTTP server is listening on port 3001
   - Verify the `TAURI_MCP_HOST` environment variable

2. **"Tool execution failed"**
   - Check console logs in your Tauri app for JavaScript errors
   - Verify CSS selectors are valid and elements exist
   - Ensure the target element is visible and interactable

3. **"MCP server not recognized"**
   - Verify Claude Desktop configuration is correct
   - Check file paths in the configuration
   - Restart Claude Desktop after configuration changes

### Logs and Monitoring

The MCP server logs all tool executions and errors to stderr. Monitor the logs while using the tools:

```bash
npm start 2>&1 | tee mcp-server.log
```

## API Reference

For detailed API specifications, see:
- [Low-level API Design](../design/low-level-api-design.md)
- [CSS Selectors Guide](../design/css-selectors-guide.md)
- [Getting Started Guide](../docs/getting-started.md)

## License

MIT License - see the main project LICENSE file for details.