# Production Builds

The Tauri Dev MCP plugin automatically disables itself in release builds for security, providing zero overhead in production.

## Build Commands

```bash
# Development (MCP enabled)
npm run tauri:dev

# Production (MCP disabled)  
npm run tauri:build
```

## Implementation

Add the plugin with conditional compilation using `debug_assertions`:

```rust
fn main() {
    env_logger::init();
    
    #[cfg(debug_assertions)]
    let app_builder = {
        log::info!("🔌 Tauri Dev MCP plugin enabled (debug build)");
        tauri::Builder::default().plugin(tauri_dev_mcp::init())
    };
    
    #[cfg(not(debug_assertions))]
    let app_builder = {
        log::info!("🚫 Tauri Dev MCP plugin disabled (release build)");
        tauri::Builder::default()
    };
    
    app_builder
        .invoke_handler(tauri::generate_handler![get_app_version, greet, get_system_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Why This Matters

**Security**: Removes HTTP API endpoints and WebView injection capabilities from production builds.
**Performance**: Zero overhead - plugin code not executed in release builds.
**Automatic**: No configuration needed - follows Rust's `debug_assertions` convention.