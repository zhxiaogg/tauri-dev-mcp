// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Test command for demonstrating invoke functionality
#[tauri::command]
fn get_app_version() -> String {
    "1.0.0".to_string()
}

#[tauri::command]
fn greet(name: String) -> String {
    format!("Hello, {}! Greetings from Tauri!", name)
}

#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "timestamp": chrono::Utc::now().to_rfc3339()
    })
}

fn main() {
    // Initialize logging to see MCP plugin messages
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
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            greet,
            get_system_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}