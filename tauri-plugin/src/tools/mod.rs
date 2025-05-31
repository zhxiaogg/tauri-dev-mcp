use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::Runtime;
use uuid::Uuid;
use log::{debug, warn};

use crate::bridge::WebViewBridge;

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolRequest {
    pub tool: String,
    pub params: Value,
}

#[derive(Debug, Serialize)]
pub struct ToolResponse {
    pub data: Value,
}

#[derive(Debug, Serialize)]
pub struct ToolError {
    pub code: String,
    pub message: String,
}

pub async fn execute_tool<R: Runtime>(
    bridge: &Arc<WebViewBridge<R>>,
    request: ToolRequest,
    results_store: &Arc<Mutex<HashMap<String, Value>>>,
) -> Result<ToolResponse, ToolError> {
    // Get HTTP API address from environment variables
    let api_host = std::env::var("TAURI_MCP_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let api_port = std::env::var("TAURI_MCP_PORT").unwrap_or_else(|_| "3001".to_string());
    let api_base_url = format!("http://{}:{}", api_host, api_port);
    // First ensure the inspector is injected
    if let Err(e) = bridge.inject_inspector().await {
        return Err(ToolError {
            code: "INSPECTOR_INJECTION_FAILED".to_string(),
            message: format!("Failed to inject inspector: {}", e),
        });
    }

    // Generate a unique execution ID
    let execution_id = Uuid::new_v4().to_string();
    debug!("Executing tool {} with ID: {}", request.tool, execution_id);
    
    // Execute the tool via JavaScript with ID
    let js_code = format!(
        r#"
        (async function() {{
            const executionId = '{}';
            const apiBaseUrl = '{}';
            try {{
                const result = await window.__TAURI_DEV_MCP.execute('{}', {});
                // Send result back via HTTP
                await fetch(apiBaseUrl + '/api/results', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{
                        id: executionId,
                        result: {{ success: true, data: result }}
                    }})
                }});
                return 'success';
            }} catch (error) {{
                // Send error back via HTTP
                await fetch(apiBaseUrl + '/api/results', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{
                        id: executionId,
                        result: {{ 
                            success: false, 
                            error: {{
                                message: error.message || 'Unknown error'
                            }}
                        }}
                    }})
                }}).catch(() => {{}});
                throw error;
            }}
        }})();
        "#,
        execution_id,
        api_base_url,
        request.tool,
        request.params
    );

    // Execute the tool
    if let Err(e) = bridge.execute_js(&js_code).await {
        warn!("JavaScript execution failed for tool {}: {}", request.tool, e);
        return Err(ToolError {
            code: "EXECUTION_ERROR".to_string(),
            message: e,
        });
    }
    
    debug!("JavaScript executed, polling for result with ID: {}", execution_id);
    
    // Poll for result
    let mut attempts = 0;
    const MAX_ATTEMPTS: u32 = 50; // 5 seconds total
    
    loop {
        // Check if result is available
        if let Ok(mut results) = results_store.lock() {
            if let Some(result_value) = results.remove(&execution_id) {
                debug!("Found result for execution ID {}: {:?}", execution_id, result_value);
                // Parse the result
                if let Some(result_obj) = result_value.as_object() {
                    if let Some(success) = result_obj.get("success").and_then(|v| v.as_bool()) {
                        if success {
                            if let Some(data) = result_obj.get("data") {
                                return Ok(ToolResponse { data: data.clone() });
                            }
                        } else {
                            if let Some(error_obj) = result_obj.get("error").and_then(|v| v.as_object()) {
                                let message = error_obj.get("message")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("Unknown error");
                                return Err(ToolError {
                                    code: "TOOL_ERROR".to_string(),
                                    message: message.to_string(),
                                });
                            }
                        }
                    }
                }
                // If we can't parse the result properly, return it as-is
                return Ok(ToolResponse { data: result_value });
            }
        }
        
        attempts += 1;
        if attempts >= MAX_ATTEMPTS {
            warn!("Timeout waiting for result with ID: {}", execution_id);
            return Err(ToolError {
                code: "TIMEOUT".to_string(),
                message: "Timeout waiting for tool execution result".to_string(),
            });
        }
        
        if attempts % 10 == 0 {
            debug!("Still waiting for result with ID: {} (attempt {})", execution_id, attempts);
        }
        
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }
}