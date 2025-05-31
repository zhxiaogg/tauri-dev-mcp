# Tauri Dev MCP Server - Simplified Project Summary

## Project Overview

This project implements a simple Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with Tauri applications for basic development and automation tasks. The system consists of two main components:

1. **Tauri Dev MCP Server** - An MCP-compliant server with core development tools
2. **Tauri Plugin** - A simple plugin that runs inside Tauri apps, exposing an HTTP API

## Architecture Overview

```
┌─────────────────┐    JSON-RPC 2.0     ┌─────────────────┐    HTTP/REST    ┌─────────────────┐
│   MCP Client    │ ←→ (STDIO only) ←→  │  Tauri Dev MCP  │ ←→             │  Tauri Plugin   │
│   (Claude AI)   │                     │     Server      │                 │   (HTTP API)    │
└─────────────────┘                     └─────────────────┘                 └─────────────────┘
                                                                                      ↓
                                                                             ┌─────────────────┐
                                                                             │   Tauri App     │
                                                                             │   (WebView)     │
                                                                             └─────────────────┘
```

## Core Features

### 🔍 DOM Inspection
- **Element Analysis**: Get element information including styles and attributes via CSS selectors
- **CSS Selectors**: Query single or multiple elements using standard CSS selectors

### 📝 Console Monitoring
- **Console Logs**: Retrieve console messages (snapshot, no real-time streaming)

### 🤖 Basic Automation
- **Click Actions**: Click elements by CSS selector
- **Text Input**: Input text into form fields by CSS selector

## Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| **DOM** | `inspect_element`, `query_selector` | Element inspection |
| **Console** | `get_console_logs` | Console message retrieval |
| **Automation** | `click_element`, `input_text` | Basic user interaction |

## Technical Specifications

### MCP Server
- **Protocol**: JSON-RPC 2.0 with MCP extensions
- **Transport**: STDIO only
- **Languages**: TypeScript/Node.js or Python
- **SDKs**: Official MCP SDK support

### Tauri Plugin
- **Language**: Rust
- **HTTP Server**: Simple REST API
- **Port**: Fixed (3001)
- **Security**: None (dev tool only)

### API Design
- **Simple REST**: Basic HTTP POST/GET
- **JSON Schema**: Typed request/response
- **Error Handling**: Basic error codes

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] MCP server framework setup
- [ ] Basic Tauri plugin structure
- [ ] HTTP API foundation

### Phase 2: DOM Tools
- [ ] Element inspection
- [ ] CSS selector querying

### Phase 3: Console Tools
- [ ] Console log capture

### Phase 4: Automation
- [ ] Click automation
- [ ] Text input simulation

## Use Cases

### Development & Debugging
- **AI-assisted debugging**: Interactive element inspection with AI guidance
- **Simple automation**: Basic UI interaction automation
- **Console monitoring**: Track application logs and errors

### Benefits

- **Simple Setup**: Minimal configuration required
- **Development Focus**: Core functionality for dev environments
- **Easy Integration**: Works with existing Tauri applications

## Getting Started

### Prerequisites
- Tauri application
- Node.js or Python for MCP server
- Claude Desktop or other MCP-compatible client

### Quick Setup
1. Add Tauri plugin to your app
2. Run MCP server
3. Configure MCP client
4. Start development with AI assistance

### Example Integration
```rust
// Add to Tauri app
fn main() {
    Builder::default()
        .plugin(tauri_dev_mcp::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```json
// MCP client configuration
{
  "mcpServers": {
    "tauri-dev": {
      "command": "node",
      "args": ["tauri-dev-mcp-server"]
    }
  }
}
```