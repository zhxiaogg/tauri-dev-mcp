use serde_json::Value;
use std::sync::Arc;
use tauri::{AppHandle, Manager, Runtime, WebviewWindow};
use tokio::sync::Mutex;

pub struct WebViewBridge<R: Runtime> {
    app: AppHandle<R>,
    window: Arc<Mutex<Option<WebviewWindow<R>>>>,
}

impl<R: Runtime> WebViewBridge<R> {
    pub fn new(app: AppHandle<R>) -> Self {
        Self {
            app,
            window: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn is_ready(&self) -> bool {
        self.get_window().await.is_some()
    }

    pub async fn get_window(&self) -> Option<WebviewWindow<R>> {
        let mut window_guard = self.window.lock().await;
        
        if window_guard.is_none() {
            // Try to get the main window
            if let Some(window) = self.app.get_webview_window("main") {
                *window_guard = Some(window.clone());
                return Some(window);
            }
            
            // Try to get any available window
            if let Some(window) = self.app.webview_windows().values().next() {
                *window_guard = Some(window.clone());
                return Some(window.clone());
            }
        }
        
        window_guard.clone()
    }

    pub async fn execute_js(&self, code: &str) -> Result<Value, String> {
        let window = self.get_window().await
            .ok_or_else(|| "No WebView window available".to_string())?;

        // For now, just execute the code and return success
        // The actual result will be handled by the JavaScript layer
        match window.eval(code) {
            Ok(_) => Ok(serde_json::json!({
                "success": true,
                "message": "Tool executed successfully"
            })),
            Err(e) => Err(format!("JavaScript execution failed: {}", e))
        }
    }

    pub async fn inject_inspector(&self) -> Result<(), String> {
        let inspector_js = include_str!("../js/inspector.js");
        self.execute_js(inspector_js).await?;
        Ok(())
    }
}