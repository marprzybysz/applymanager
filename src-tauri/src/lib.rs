#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Rust backend is connected.", name)
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
