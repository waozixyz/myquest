use dotenv::dotenv;
use reqwest::Client;
use rusqlite::{Connection, Result as SqliteResult}; 
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::env;
use tauri::Manager;
use uuid::Uuid;
use chrono::Utc;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Todo {
    id: Option<i64>,
    day: String,
    content: String,
    last_modified: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct PeerState {
    peer_id: Option<String>,
    connected_peers: Vec<String>,
    last_sync: Option<String>,
    device_name: Option<String>,
    device_type: Option<String>,
}

struct AppState {
    db: Arc<Mutex<Connection>>,
    http_client: Client,
    peer_state: Arc<Mutex<PeerState>>,
}

fn init_database(conn: &Connection) -> SqliteResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day TEXT NOT NULL,
            content TEXT NOT NULL,
            last_modified TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS peer_connections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            peer_id TEXT UNIQUE NOT NULL,
            last_sync TEXT DEFAULT CURRENT_TIMESTAMP,
            device_name TEXT,
            device_type TEXT
        )",
        [],
    )?;
    
    Ok(())
}

#[tauri::command]
async fn add_todo(state: tauri::State<'_, AppState>, todo: Todo) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let now = Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO todos (day, content, last_modified) VALUES (?, ?, ?)",
        (&todo.day, &todo.content, &now),
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_todos(state: tauri::State<'_, AppState>, day: String) -> Result<Vec<Todo>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, day, content, last_modified FROM todos WHERE day = ?")
        .map_err(|e| e.to_string())?;

    let todos = stmt
        .query_map([day], |row| {
            Ok(Todo {
                id: Some(row.get(0)?),
                day: row.get(1)?,
                content: row.get(2)?,
                last_modified: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(todos)
}

#[tauri::command]
async fn delete_todo(state: tauri::State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM todos WHERE id = ?", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn export_data(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, day, content, last_modified FROM todos")
        .map_err(|e| e.to_string())?;

    let todos = stmt
        .query_map([], |row| {
            Ok(Todo {
                id: Some(row.get(0)?),
                day: row.get(1)?,
                content: row.get(2)?,
                last_modified: row.get(3).ok(),
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    serde_json::to_string(&todos).map_err(|e| e.to_string())
}

#[tauri::command]
async fn import_data(state: tauri::State<'_, AppState>, data: String) -> Result<(), String> {
    let mut conn = state.db.lock().unwrap(); // Add mut here
    let todos: Vec<Todo> = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    tx.execute("DELETE FROM todos", [])
        .map_err(|e| e.to_string())?;

    for todo in todos {
        tx.execute(
            "INSERT INTO todos (day, content, last_modified) VALUES (?, ?, ?)",
            (
                &todo.day,
                &todo.content,
                &todo.last_modified.unwrap_or_else(|| Utc::now().to_rfc3339()),
            ),
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())
}


#[tauri::command]
async fn connect_peer(
    state: tauri::State<'_, AppState>,
    peer_id: Option<String>,
    device_name: Option<String>,
    device_type: Option<String>,
) -> Result<String, String> {
    let mut peer_state = state.peer_state.lock().unwrap();
    let conn = state.db.lock().unwrap();
    
    if let Some(target_peer_id) = peer_id {
        // Connect to existing peer
        conn.execute(
            "INSERT OR REPLACE INTO peer_connections (peer_id, last_sync, device_name, device_type) 
             VALUES (?, CURRENT_TIMESTAMP, ?, ?)",
            (&target_peer_id, &device_name, &device_type),
        ).map_err(|e| e.to_string())?;
        
        peer_state.connected_peers.push(target_peer_id.clone());
        Ok(target_peer_id)
    } else {
        // Generate new peer ID
        let new_peer_id = Uuid::new_v4().to_string();
        peer_state.peer_id = Some(new_peer_id.clone());
        Ok(new_peer_id)
    }
}

#[tauri::command]
async fn disconnect_peer(state: tauri::State<'_, AppState>, peer_id: String) -> Result<(), String> {
    let mut peer_state = state.peer_state.lock().unwrap();
    let conn = state.db.lock().unwrap();
    
    conn.execute(
        "DELETE FROM peer_connections WHERE peer_id = ?",
        [&peer_id],
    ).map_err(|e| e.to_string())?;
    
    peer_state.connected_peers.retain(|p| p != &peer_id);
    Ok(())
}

#[tauri::command]
async fn get_peer_id(state: tauri::State<'_, AppState>) -> Result<Option<String>, String> {
    let peer_state = state.peer_state.lock().unwrap();
    Ok(peer_state.peer_id.clone())
}

#[tauri::command]
async fn is_peer_connected(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let peer_state = state.peer_state.lock().unwrap();
    Ok(peer_state.peer_id.is_some() && !peer_state.connected_peers.is_empty())
}

#[tauri::command]
async fn update_todo_order(state: tauri::State<'_, AppState>, day: String, todos: Vec<Todo>) -> Result<(), String> {
    let mut conn = state.db.lock().unwrap(); // Add mut here
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM todos WHERE day = ?", [&day])
        .map_err(|e| e.to_string())?;

    for todo in todos {
        let now = Utc::now().to_rfc3339();
        tx.execute(
            "INSERT INTO todos (day, content, last_modified) VALUES (?, ?, ?)",
            (&day, &todo.content, &now),
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())
}

#[tauri::command]
async fn move_todo_to_day(state: tauri::State<'_, AppState>, todo: Todo, new_day: String) -> Result<(), String> {
    let mut conn = state.db.lock().unwrap(); // Add mut here
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let todo_id = todo.id.ok_or("Todo doesn't have an id")?;
    let now = Utc::now().to_rfc3339();

    tx.execute(
        "UPDATE todos SET day = ?, last_modified = ? WHERE id = ?",
        (&new_day, &now, &todo_id),
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())
}

#[tauri::command]
async fn sync_todos(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let peer_state = state.peer_state.lock().unwrap();
    
    if peer_state.peer_id.is_none() {
        return Err("No peer ID available".to_string());
    }
    
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE peer_connections SET last_sync = ? WHERE peer_id = ?",
        (&now, &peer_state.peer_id.as_ref().unwrap()),
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenv().ok();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
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
            
            let initial_peer_state = PeerState {
                peer_id: None,
                connected_peers: Vec::new(),
                last_sync: None,
                device_name: None,
                device_type: None,
            };
            
            app.manage(AppState {
                db: Arc::new(Mutex::new(conn)),
                http_client: Client::new(),
                peer_state: Arc::new(Mutex::new(initial_peer_state)),
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
            update_todo_order,
            move_todo_to_day,
            connect_peer,
            disconnect_peer,
            get_peer_id,
            is_peer_connected
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}