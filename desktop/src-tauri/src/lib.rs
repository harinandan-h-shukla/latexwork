// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // Spike A, step 3: lets the webview's JS reach local-agent
        // (http://localhost:47823) despite the webview engine's own
        // mixed-content/Private-Network-Access-style block on a
        // loaded-from-remote page's JS calling fetch() against localhost
        // directly (confirmed via Tauri's own maintainer discussion,
        // github.com/tauri-apps/tauri/discussions/11970 — no config bypass
        // exists at the webview level). This plugin performs the HTTP
        // request here in Rust instead, outside that restriction, and
        // returns the result to JS over invoke(). The actual allowed-URL
        // scoping (http://localhost:47823/*) lives in
        // capabilities/default.json, not here.
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
