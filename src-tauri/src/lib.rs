use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::Manager;
use reqwest::Client;
use dotenv::dotenv;
use std::env;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Todo {
    id: Option<i64>,
    day: String,
    content: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct TelegramUser {
    id: i64,
    first_name: String,
    username: Option<String>,
    photo_url: Option<String>,
    auth_date: i64,
    hash: String,
}

struct AppState {
    db: Arc<Mutex<Connection>>,
    http_client: Client,
}

fn init_database(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day TEXT NOT NULL,
            content TEXT NOT NULL
        )",
        [],
    )?;
    Ok(())
}

#[tauri::command]
fn add_todo(state: tauri::State<AppState>, todo: Todo) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO todos (day, content) VALUES (?, ?)",
        (&todo.day, &todo.content),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_auth_state() -> Result<serde_json::Value, String> {
    // Implement this to return the current auth state
    // For example:
    Ok(serde_json::json!({
        "isLoggedIn": true, // or false
        "username": "John Doe" // or an empty string if not logged in
    }))
}

#[tauri::command]
fn get_todos(state: tauri::State<AppState>, day: String) -> Result<Vec<Todo>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, day, content FROM todos WHERE day = ?")
        .map_err(|e| e.to_string())?;
    let todos = stmt
        .query_map([day], |row| {
            Ok(Todo {
                id: Some(row.get(0)?),
                day: row.get(1)?,
                content: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(todos)
}

#[tauri::command]
fn delete_todo(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM todos WHERE id = ?", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn export_data(state: tauri::State<AppState>) -> Result<String, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, day, content FROM todos")
        .map_err(|e| e.to_string())?;
    
    let todos = stmt
        .query_map([], |row| {
            Ok(Todo {
                id: Some(row.get(0)?),
                day: row.get(1)?,
                content: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    serde_json::to_string(&todos).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_data(state: tauri::State<AppState>, data: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let todos: Vec<Todo> = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM todos", []).map_err(|e| e.to_string())?;

    for todo in todos {
        conn.execute(
            "INSERT INTO todos (day, content) VALUES (?, ?)",
            (&todo.day, &todo.content),
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn sync_todos(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let todos = {
        let conn = state.db.lock().unwrap();
        get_all_todos(&conn).map_err(|e| e.to_string())?
    };

    let server_url = env::var("VITE_API_URL").unwrap_or_else(|_| "http://localhost:8080".to_string());
    let sync_url = format!("{}/sync", server_url);

    // Send todos to server
    let response = state.http_client.post(sync_url)
        .json(&todos)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err("Failed to sync with server".to_string());
    }

    let server_todos: Vec<Todo> = response.json().await.map_err(|e| e.to_string())?;

    // Update local database with server todos
    {
        let conn = state.db.lock().unwrap();
        conn.execute("DELETE FROM todos", []).map_err(|e| e.to_string())?;
        for todo in server_todos {
            conn.execute(
                "INSERT INTO todos (id, day, content) VALUES (?, ?, ?)",
                (&todo.id, &todo.day, &todo.content),
            ).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
async fn login_with_telegram(state: tauri::State<'_, AppState>, user: TelegramUser) -> Result<bool, String> {
    let server_url = env::var("VITE_API_URL").unwrap_or_else(|_| "http://localhost:8080".to_string());
    let login_url = format!("{}/telegram-login", server_url);

    let response = state.http_client.post(login_url)
        .json(&user)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
fn logout() -> Result<(), String> {
    // Implement any necessary logout logic
    Ok(())
}

fn get_all_todos(conn: &Connection) -> Result<Vec<Todo>, rusqlite::Error> {
    let mut stmt = conn.prepare("SELECT id, day, content FROM todos")?;
    let todos = stmt.query_map([], |row| {
        Ok(Todo {
            id: Some(row.get(0)?),
            day: row.get(1)?,
            content: row.get(2)?,
        })
    })?
    .collect::<Result<Vec<_>, _>>()?;
    Ok(todos)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenv().ok(); // Load .env file if it exists
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            let app_dir = app_handle
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).unwrap();
            let db_path = app_dir.join("todos.db");
            let conn = Connection::open(db_path).unwrap();
            init_database(&conn).unwrap();
            let http_client = Client::new();
            app.manage(AppState {
                db: Arc::new(Mutex::new(conn)),
                http_client,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            add_todo,
            get_todos,
            delete_todo,
            export_data,
            import_data,
            sync_todos,
            login_with_telegram,
            logout,
            get_auth_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}