use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::Runtime;
use uuid::Uuid;

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
    // First ensure the inspector is injected
    if let Err(e) = bridge.inject_inspector().await {
        return Err(ToolError {
            code: "INSPECTOR_INJECTION_FAILED".to_string(),
            message: format!("Failed to inject inspector: {}", e),
        });
    }

    // Generate a unique execution ID
    let execution_id = Uuid::new_v4().to_string();
    
    // Execute the tool via JavaScript with ID
    let js_code = format!(
        r#"
        (async function() {{
            const executionId = '{}';
            try {{
                const result = await window.__TAURI_DEV_MCP.execute('{}', {});
                // Send result back via HTTP
                await fetch('http://localhost:3001/api/results', {{
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
                await fetch('http://localhost:3001/api/results', {{
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
        request.tool,
        request.params
    );

    // Execute the tool
    if let Err(e) = bridge.execute_js(&js_code).await {
        return Err(ToolError {
            code: "EXECUTION_ERROR".to_string(),
            message: e,
        });
    }
    
    // Poll for result
    let mut attempts = 0;
    const MAX_ATTEMPTS: u32 = 50; // 5 seconds total
    
    loop {
        // Check if result is available
        if let Ok(mut results) = results_store.lock() {
            if let Some(result_value) = results.remove(&execution_id) {
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
            return Err(ToolError {
                code: "TIMEOUT".to_string(),
                message: "Timeout waiting for tool execution result".to_string(),
            });
        }
        
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }
}