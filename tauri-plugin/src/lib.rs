use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime, State, command,
};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use serde_json::Value;

mod http;
mod bridge;
mod tools;

pub use http::*;
pub use bridge::*;
pub use tools::*;

const PLUGIN_NAME: &str = "tauri-dev-mcp";

// Shared state for storing execution results
type ResultStore = Arc<Mutex<HashMap<String, Value>>>;

#[command]
async fn store_execution_result(
    id: String,
    result: Value,
    store: State<'_, ResultStore>,
) -> Result<(), String> {
    let mut results = store.lock().map_err(|e| format!("Lock error: {}", e))?;
    results.insert(id, result);
    Ok(())
}

/// Initialize the plugin
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    let result_store: ResultStore = Arc::new(Mutex::new(HashMap::new()));
    
    Builder::new(PLUGIN_NAME)
        .invoke_handler(tauri::generate_handler![store_execution_result])
        .setup(|app, _api| {
            // Store the result store in app state
            app.manage(result_store);
            
            // Initialize the HTTP server in the background
            let app_handle = app.app_handle().clone();
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
                rt.block_on(async move {
                    if let Err(e) = http::start_server(app_handle).await {
                        eprintln!("Failed to start MCP HTTP server: {}", e);
                    }
                });
            });
            Ok(())
        })
        .build()
}