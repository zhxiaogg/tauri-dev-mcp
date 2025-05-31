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

use crate::bridge::WebViewBridge;
use crate::tools::{execute_tool, ToolRequest};

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
        .route("/api/results", post(store_result))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3001").await?;
    
    println!("Tauri Dev MCP server listening on http://127.0.0.1:3001");
    
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
    let mut results = state.results.lock().unwrap();
    results.insert(request.id, request.result);
    Ok(StatusCode::OK)
}