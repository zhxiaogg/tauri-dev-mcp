# Tauri Dev MCP Server - Simplified Architecture

## Overview

The Tauri Dev MCP Server is a development tool that enables AI assistants (like Claude) to interact with Tauri applications for DOM inspection, console monitoring, and basic automation. It acts as a bridge between MCP clients and a single Tauri app via HTTP API.

## Architecture Components

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

## Core Components

### 1. MCP Server Core
- **Transport Layer**: STDIO transport only
- **Protocol Handler**: JSON-RPC 2.0 with MCP extensions
- **Tool Registry**: Static tool registration

### 2. Tauri Bridge
- **HTTP Client**: Simple HTTP requests to Tauri plugin
- **Response Transformation**: Convert Tauri responses to MCP format
- **Error Handling**: Basic error mapping

### 3. Core Tools

#### DOM Inspection Tools
- `inspect_element` - Get detailed element info (styles, attributes) for ONE element
- `query_selector` - Find MULTIPLE elements, basic info only

#### Console Tools
- `get_console_logs` - Retrieve latest N console messages (newest first)

#### Automation Tools
- `click_element` - Click elements (left/right/double click)
- `input_text` - Type text into form fields
- `scroll_to_element` - Scroll to bring elements into view
- `hover_element` - Hover over elements to trigger hover states
- `select_option` - Select dropdown options
- `check_checkbox` - Check/uncheck checkboxes and radio buttons
- `press_key` - Send keyboard input (Enter, Tab, Escape, etc.)
- `wait_for_element` - Wait for elements to appear/disappear/change state

## Tool Capabilities Matrix

| Category | Tool | Input | Output | Side Effects |
|----------|------|-------|--------|--------------|
| DOM | `inspect_element` | CSS selector | detailed element info | None |
| DOM | `query_selector` | CSS selector | multiple elements list | None |
| Console | `get_console_logs` | limit + level filter | latest N log entries | Optional clear |
| Automation | `click_element` | CSS selector + click type | success status | Click event |
| Automation | `input_text` | CSS selector + text | success status | Form input |
| Automation | `scroll_to_element` | CSS selector | success status | Page scroll |
| Automation | `hover_element` | CSS selector | success status | Hover state |
| Automation | `select_option` | selector + option | success status | Selection change |
| Automation | `check_checkbox` | CSS selector + state | success status | Checkbox state |
| Automation | `press_key` | key + modifiers | success status | Key event |
| Automation | `wait_for_element` | selector + condition | wait result | None |

## Data Flow

### Tool Execution Flow
```
1. MCP Client → Tool Call Request → MCP Server
2. MCP Server → Validate Input → Bridge Layer  
3. Bridge Layer → HTTP Request → Tauri Plugin
4. Tauri Plugin → Execute in WebView → Return Result
5. Bridge Layer → Transform Response → MCP Server
6. MCP Server → Format Response → MCP Client
```

## Error Handling Strategy

### Tool Execution Errors
- **Input Validation**: Basic CSS selector validation
- **Error Mapping**: Convert Tauri errors to MCP error format
- **Timeout Handling**: Simple timeout for HTTP requests

## Implementation Notes

- Single Tauri app connection (localhost:3001)
- No authentication/security required (dev tool only)
- No real-time streaming or events
- No batching or complex operations
- No application state monitoring
- Future: Optional `list_tools` and `invoke_tool` support