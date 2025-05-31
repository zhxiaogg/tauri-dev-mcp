// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Initialize logging to see MCP plugin messages
    env_logger::init();
    
    tauri::Builder::default()
        .plugin(tauri_dev_mcp::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}