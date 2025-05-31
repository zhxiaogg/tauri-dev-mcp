# Tauri Dev MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to interact with Tauri applications for development, debugging, and automation.

## Features

- **DOM Inspection**: `inspect_element`, `query_selector`
- **Console Monitoring**: `get_console_logs`
- **UI Automation**: `click_element`, `input_text`, `scroll_to_element`, `hover_element`, `select_option`, `check_checkbox`, `press_key`, `wait_for_element`

## Quick Start

1. **Build components**
   ```bash
   cd mcp-server && npm install && npm run build
   cd ../tauri-plugin && cargo build --release
   ```

2. **Run example app** (with optional custom address)
   ```bash
   # Default (127.0.0.1:3001)
   cd example-app && npm run tauri dev

   # Custom address
   cd example-app && TAURI_MCP_HOST=localhost TAURI_MCP_PORT=8080 npm run tauri dev
   ```

3. **Configure Claude Desktop**
   ```json
   {
     "mcpServers": {
       "tauri-dev": {
         "command": "node",
         "args": ["./mcp-server/dist/index.js"],
         "env": {
           "TAURI_MCP_HOST": "localhost",
           "TAURI_MCP_PORT": "8080"
         }
       }
     }
   }
   ```
   > **Note**: Use same `TAURI_MCP_HOST`/`TAURI_MCP_PORT` values in both Tauri app and MCP server config. Omit `env` field for defaults (127.0.0.1:3001).

## Testing
```bash
npm test
```

## License
MIT
