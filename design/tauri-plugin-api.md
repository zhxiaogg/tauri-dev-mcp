# Tauri Plugin HTTP API Specification

## Overview

The Tauri plugin exposes a simple HTTP API that enables the MCP server to interact with the Tauri application's WebView for DOM inspection, console monitoring, and basic automation.

## Plugin Architecture

```rust
// Plugin structure
pub struct TauriDevMcpPlugin {
    http_server: HttpServer,
    webview_bridge: WebViewBridge,
}
```

## HTTP Server Configuration

### Default Settings
- **Port**: 3001 (fixed)
- **Host**: 127.0.0.1 (localhost only)
- **Protocol**: HTTP only

## API Endpoints

### Core Endpoints

#### `GET /api/health`
Health check

**Response**:
```json
{
  "status": "healthy",
  "webview_ready": true
}
```

#### `POST /api/execute`
Execute a tool command

**Request**:
```json
{
  "tool": "inspect_element",
  "params": {
    "selector": "#my-button",
    "include_styles": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "element": {
      "tagName": "BUTTON",
      "id": "my-button",
      "textContent": "Click me"
    }
  }
}
```






## Error Responses

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "ELEMENT_NOT_FOUND",
    "message": "No element found matching selector '#missing-element'"
  }
}
```

### Error Codes
- `INVALID_REQUEST` - Malformed request
- `ELEMENT_NOT_FOUND` - CSS selector returned no results
- `ELEMENT_NOT_INTERACTABLE` - Element not clickable/visible
- `WEBVIEW_NOT_READY` - WebView not initialized
- `INTERNAL_ERROR` - Unexpected error

## Rust Implementation Structure

### Plugin Registration
```rust
use tauri::Builder;

fn main() {
    Builder::default()
        .plugin(tauri_dev_mcp::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### HTTP Server Setup
```rust
use axum::{Router, routing::{get, post}};

pub fn create_router() -> Router {
    Router::new()
        .route("/api/health", get(health_handler))
        .route("/api/execute", post(execute_handler))
}
```

### WebView Bridge
```rust
use tauri::Window;

pub struct WebViewBridge {
    window: Window,
}

impl WebViewBridge {
    pub async fn execute_js(&self, code: &str) -> Result<serde_json::Value, Error> {
        self.window.eval(code)
    }
}
```