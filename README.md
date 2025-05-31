# Tauri Dev MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to interact with Tauri applications for development, debugging, and automation.

## Project Structure

```
tauri-dev-mcp/
├── design/                    # Architecture and API documentation
├── mcp-server/               # MCP server implementation (TypeScript)
├── tauri-plugin/             # Tauri plugin (Rust)
├── example-app/              # Example Tauri app for testing
└── docs/                     # Usage documentation
```

## Components

### MCP Server
- **Language**: TypeScript/Node.js
- **Transport**: STDIO only
- **Tools**: 11 tools for DOM inspection, console monitoring, and automation

### Tauri Plugin
- **Language**: Rust
- **HTTP API**: Simple REST API on localhost:3001
- **Features**: WebView bridge, DOM manipulation, event simulation

## Quick Start

1. **Install dependencies**
   ```bash
   cd mcp-server && npm install
   cd ../tauri-plugin && cargo build
   ```

2. **Run example app**
   ```bash
   cd example-app && npm run tauri dev
   ```

3. **Start MCP server**
   ```bash
   cd mcp-server && npm start
   ```

4. **Configure Claude Desktop**
   Add to your MCP configuration:
   ```json
   {
     "mcpServers": {
       "tauri-dev": {
         "command": "node",
         "args": ["./mcp-server/dist/index.js"]
       }
     }
   }
   ```

## Features

### DOM Inspection
- `inspect_element` - Get detailed element information with styles
- `query_selector` - Find multiple elements by CSS selector

### Console Monitoring  
- `get_console_logs` - Retrieve latest console messages (newest first)

### Automation Tools
- `click_element` - Click elements (left/right/double)
- `input_text` - Type text into form fields
- `scroll_to_element` - Scroll to bring elements into view
- `hover_element` - Trigger hover states
- `select_option` - Select dropdown options
- `check_checkbox` - Check/uncheck checkboxes
- `press_key` - Send keyboard input
- `wait_for_element` - Wait for element state changes

## CSS Selectors

Supports all standard CSS selectors:
- Element: `div`, `button`, `input`
- ID: `#my-button`
- Class: `.nav-item`, `.btn.primary`
- Attribute: `[type="email"]`, `[data-testid="submit"]`
- Descendant: `.container button`, `form > input`
- Pseudo: `:hover`, `:focus`, `:checked`

See `design/css-selectors-guide.md` for comprehensive examples.

## License

MIT License