use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::{AppHandle, Runtime};
use tower_http::cors::CorsLayer;
use log::{debug, info};

use crate::bridge::WebViewBridge;
use crate::tools::{execute_tool, execute_generic, ToolRequest};

// Storage for JavaScript execution results
type ResultStore = Arc<Mutex<HashMap<String, serde_json::Value>>>;

pub struct AppState<R: Runtime> {
    pub app: AppHandle<R>,
    pub bridge: Arc<WebViewBridge<R>>,
    pub results: ResultStore,
}

impl<R: Runtime> Clone for AppState<R> {
    fn clone(&self) -> Self {
        Self {
            app: self.app.clone(),
            bridge: Arc::clone(&self.bridge),
            results: Arc::clone(&self.results),
        }
    }
}

#[derive(Serialize)]
pub struct HealthResponse {
    status: String,
    webview_ready: bool,
}

#[derive(Deserialize)]
pub struct ExecuteRequest {
    tool: String,
    params: serde_json::Value,
}

#[derive(Serialize)]
pub struct ExecuteResponse {
    success: bool,
    data: Option<serde_json::Value>,
    error: Option<ErrorResponse>,
}

#[derive(Serialize)]
pub struct ErrorResponse {
    code: String,
    message: String,
}

#[derive(Deserialize)]
pub struct StoreResultRequest {
    id: String,
    result: serde_json::Value,
}

#[derive(Deserialize)]
pub struct InvokeRequest {
    command: String,
    args: Option<serde_json::Value>,
}


pub async fn start_server<R: Runtime + 'static>(app: AppHandle<R>) -> anyhow::Result<()> {
    let bridge = Arc::new(WebViewBridge::new(app.clone()));
    let results = Arc::new(Mutex::new(HashMap::new()));
    
    let state = AppState {
        app: app.clone(),
        bridge,
        results,
    };

    let app_router = Router::new()
        .route("/api/health", get(health))
        .route("/api/execute", post(execute))
        .route("/api/invoke", post(invoke))
        .route("/api/results", post(store_result))
        .layer(CorsLayer::permissive())
        .with_state(state);

    // Get HTTP API address from environment variable with default
    let api_host = std::env::var("TAURI_MCP_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let api_port = std::env::var("TAURI_MCP_PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse::<u16>()
        .unwrap_or(3001);
    
    let api_address = format!("{}:{}", api_host, api_port);
    let listener = tokio::net::TcpListener::bind(&api_address).await?;
    
    info!("🌐 Tauri Dev MCP HTTP API server started");
    info!("📡 API Address: http://{}", api_address);
    info!("🔗 Available endpoints:");
    info!("   GET  /api/health  - Check server health");
    info!("   POST /api/execute - Execute MCP tools");
    info!("   POST /api/invoke  - Invoke Tauri commands");
    
    axum::serve(listener, app_router).await?;
    
    Ok(())
}

async fn health<R: Runtime>(State(state): State<AppState<R>>) -> Json<HealthResponse> {
    let webview_ready = state.bridge.is_ready().await;
    
    Json(HealthResponse {
        status: "healthy".to_string(),
        webview_ready,
    })
}

async fn execute<R: Runtime>(
    State(state): State<AppState<R>>,
    Json(request): Json<ExecuteRequest>,
) -> Result<Json<ExecuteResponse>, StatusCode> {
    debug!("Received execute request: {} - {:?}", request.tool, request.params);
    
    let tool_request = ToolRequest {
        tool: request.tool,
        params: request.params,
    };

    match execute_tool(&state.bridge, tool_request, &state.results).await {
        Ok(response) => Ok(Json(ExecuteResponse {
            success: true,
            data: Some(response.data),
            error: None,
        })),
        Err(e) => Ok(Json(ExecuteResponse {
            success: false,
            data: None,
            error: Some(ErrorResponse {
                code: e.code,
                message: e.message,
            }),
        })),
    }
}

async fn store_result<R: Runtime>(
    State(state): State<AppState<R>>,
    Json(request): Json<StoreResultRequest>,
) -> Result<StatusCode, StatusCode> {
    debug!("Storing result for execution ID: {}", request.id);
    let mut results = state.results.lock().unwrap();
    results.insert(request.id.clone(), request.result);
    debug!("Result stored successfully for ID: {}", request.id);
    Ok(StatusCode::OK)
}

async fn invoke<R: Runtime>(
    State(state): State<AppState<R>>,
    Json(request): Json<InvokeRequest>,
) -> Result<Json<ExecuteResponse>, StatusCode> {
    debug!("Received invoke request: {} - {:?}", request.command, request.args);
    
    // Use the shared generic execution logic
    let params = request.args.unwrap_or(serde_json::Value::Object(serde_json::Map::new()));
    
    match execute_generic(&state.bridge, request.command, params, &state.results, "invoke").await {
        Ok(response) => Ok(Json(ExecuteResponse {
            success: true,
            data: Some(response.data),
            error: None,
        })),
        Err(e) => Ok(Json(ExecuteResponse {
            success: false,
            data: None,
            error: Some(ErrorResponse {
                code: e.code,
                message: e.message,
            }),
        })),
    }
}


