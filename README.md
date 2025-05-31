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

3. **Add plugin to your Tauri app**
   ```toml
   # In your Cargo.toml
   [dependencies]
   tauri-dev-mcp = { path = "path/to/tauri-dev-mcp/tauri-plugin" }
   ```

   ```rust
   // In your main.rs
   fn main() {
       // Initialize logging (choose one):
       env_logger::init();  // For env_logger
       // OR
       tracing_subscriber::fmt::init();  // For tracing

       tauri::Builder::default()
           .plugin(tauri_dev_mcp::init())
           .run(tauri::generate_context!())
           .expect("error while running tauri application");
   }
   ```
   > **Logs**: Plugin will show startup messages like "🌐 Tauri Dev MCP HTTP API server started" and "✅ MCP Inspector injected successfully!"

4. **Configure Claude Desktop**
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

## Troubleshooting

### Inspector Not Available

**Problem**: `window.__TAURI_DEV_MCP` is undefined

**Solution**: The inspector auto-injects on first tool call. If issues persist, ensure logging is configured and check terminal for error messages.

## License
MIT
