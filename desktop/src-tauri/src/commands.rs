use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::Manager;

fn normalize_server_url(url: &str) -> Result<String, String> {
    let trimmed = url.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err("Server URL cannot be empty".to_string());
    }

    let parsed = reqwest::Url::parse(trimmed).map_err(|_| "Server URL is invalid".to_string())?;
    match parsed.scheme() {
        "http" | "https" => Ok(parsed.to_string().trim_end_matches('/').to_string()),
        _ => Err("Server URL must start with http:// or https://".to_string()),
    }
}

#[derive(Serialize)]
pub struct AppInfo {
    pub version: String,
    pub name: String,
    pub os: String,
    pub arch: String,
}

#[tauri::command]
pub fn get_app_info() -> AppInfo {
    AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        name: env!("CARGO_PKG_NAME").to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    }
}

#[derive(Serialize, Deserialize)]
pub struct HealthStatus {
    pub healthy: bool,
    pub version: String,
    pub message: String,
}

#[tauri::command]
pub async fn check_server_health(server_url: String) -> Result<HealthStatus, String> {
    let normalized = normalize_server_url(&server_url)?;
    let url = format!("{normalized}/api/v1/health");
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;

    if resp.status().is_success() {
        let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let data = &body["data"];
        Ok(HealthStatus {
            healthy: true,
            version: data["version"].as_str().unwrap_or("unknown").to_string(),
            message: "Server is healthy".to_string(),
        })
    } else {
        Ok(HealthStatus {
            healthy: false,
            version: String::new(),
            message: format!("Server returned status {}", resp.status()),
        })
    }
}

#[tauri::command]
pub async fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    // 如果已存在就 focus，否则创建
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    tauri::WebviewWindowBuilder::new(&app, "settings", tauri::WebviewUrl::App("/settings".into()))
        .title("Settings - Prowl Range Desktop")
        .inner_size(600.0, 500.0)
        .resizable(true)
        .center()
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

// 服务器地址管理（通过 store plugin 持久化由前端处理，这里提供便捷方法）
#[tauri::command]
pub fn set_server_url(_app: tauri::AppHandle, url: String) -> Result<String, String> {
    normalize_server_url(&url)
}

#[tauri::command]
pub fn get_server_url() -> String {
    "http://localhost:38080".to_string()
}
