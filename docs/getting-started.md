# Getting Started with Tauri Dev MCP

This guide will help you set up and use the Tauri Dev MCP server for AI-assisted development and automation.

## Installation

### 1. Install Dependencies

**MCP Server (Node.js/TypeScript):**
```bash
cd mcp-server
npm install
npm run build
```

**Tauri Plugin (Rust):**
```bash
cd tauri-plugin
cargo build
```

### 2. Add Plugin to Your Tauri 2.x App

In your Tauri app's `src-tauri/Cargo.toml`:
```toml
[dependencies]
tauri = { version = "2.0", features = [] }
tauri-dev-mcp = { path = "path/to/tauri-plugin" }
```

In your Tauri app's `src-tauri/src/main.rs`:
```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_dev_mcp::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 3. Configure Claude Desktop

Add to your MCP configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "tauri-dev": {
      "command": "node",
      "args": ["path/to/mcp-server/dist/index.js"]
    }
  }
}
```

## Quick Start

1. **Start your Tauri app** with the plugin integrated
2. **Start the MCP server**:
   ```bash
   cd mcp-server
   npm start
   ```
3. **Open Claude Desktop** - the Tauri Dev tools should now be available

## Testing the Setup

You can test the integration using the provided example app:

```bash
# Terminal 1: Start the example Tauri app
cd example-app
npm install
npm run tauri:dev

# Terminal 2: Start the MCP server
cd mcp-server
npm start

# Terminal 3: Test the HTTP API directly
curl http://localhost:3001/api/health
```

The MCP server should connect to the Tauri app automatically when both are running.

## Available Tools

The MCP server provides 11 tools for interacting with your Tauri application:

### DOM Inspection
- **inspect_element** - Get detailed element information (styles, attributes, etc.)
- **query_selector** - Find multiple elements by CSS selector

### Console Monitoring  
- **get_console_logs** - Retrieve latest console messages (newest first)

### Automation
- **click_element** - Click elements by CSS selector
- **input_text** - Type text into form fields
- **scroll_to_element** - Scroll to bring elements into view
- **hover_element** - Trigger hover states
- **select_option** - Select dropdown options
- **check_checkbox** - Check/uncheck checkboxes
- **press_key** - Send keyboard input
- **wait_for_element** - Wait for element state changes

## Example Usage in Claude

Once set up, you can interact with your Tauri app through Claude:

```
"Can you inspect the main navigation menu?"
"Click the submit button in the login form"
"Get the latest 10 console log entries"
"Fill out the contact form with test data"
```

## Next Steps

- Check out the [CSS Selectors Guide](../design/css-selectors-guide.md) for selector syntax
- Review the [API Documentation](api-reference.md) for detailed tool specifications
- See [Common Use Cases](use-cases.md) for practical examples