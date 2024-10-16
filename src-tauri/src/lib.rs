use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug)]
struct Todo {
    id: Option<i64>,
    day: String,
    content: String,
}

struct AppState {
    db: Mutex<Connection>,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            let app_dir = app_handle
                .path().app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).unwrap();
            let db_path = app_dir.join("todos.db");
            let conn = Connection::open(db_path).unwrap();
            init_database(&conn).unwrap();
            app.manage(AppState {
                db: Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            add_todo,
            get_todos,
            delete_todo,
            export_data,
            import_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}