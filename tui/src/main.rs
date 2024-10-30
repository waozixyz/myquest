use anyhow::Result;
use chrono::Local;
use crossterm::{
    event::{self, Event, KeyCode, KeyModifiers},
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
    ExecutableCommand,
};
use ratatui::{
    prelude::*,
    widgets::{Block, Borders, List, ListItem, ListState, Paragraph},
};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::io::stdout;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Todo {
    id: Option<i64>,
    day: String,
    content: String,
}

enum InputMode {
    Normal,
    Editing,
}

struct App {
    todos: Vec<Todo>,
    input: String,
    selected: Option<usize>,
    input_mode: InputMode,
    conn: Connection,
    current_day: String,
    list_state: ListState,
}

impl App {
    fn new() -> Result<App> {
        // Get the same app data directory as Tauri
        let app_dir = dirs::data_dir()
            .unwrap()
            .join("com.myquest.dev");
        
        std::fs::create_dir_all(&app_dir)?;
        let db_path = app_dir.join("todos.db");
        let conn = Connection::open(&db_path)?;
        
        // Initialize database
        conn.execute(
            "CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                day TEXT NOT NULL,
                content TEXT NOT NULL
            )",
            [],
        )?;

        let current_day = Local::now().format("%Y-%m-%d").to_string();
        let mut list_state = ListState::default();
        list_state.select(None);
        
        Ok(App {
            todos: Vec::new(),
            input: String::new(),
            selected: None,
            input_mode: InputMode::Normal,
            conn,
            current_day,
            list_state,
        })
    }

    fn load_todos(&mut self) -> Result<()> {
        let mut stmt = self.conn.prepare(
            "SELECT id, day, content FROM todos WHERE day = ?"
        )?;
        
        self.todos = stmt.query_map([&self.current_day], |row| {
            Ok(Todo {
                id: Some(row.get(0)?),
                day: row.get(1)?,
                content: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
        
        Ok(())
    }

    fn add_todo(&mut self) -> Result<()> {
        if self.input.is_empty() {
            return Ok(());
        }

        self.conn.execute(
            "INSERT INTO todos (day, content) VALUES (?, ?)",
            (&self.current_day, &self.input),
        )?;

        self.input.clear();
        self.load_todos()?;
        Ok(())
    }

    fn delete_selected_todo(&mut self) -> Result<()> {
        if let Some(selected) = self.selected {
            if let Some(todo) = self.todos.get(selected) {
                if let Some(id) = todo.id {
                    self.conn.execute("DELETE FROM todos WHERE id = ?", [id])?;
                    self.load_todos()?;
                }
            }
        }
        Ok(())
    }
}

fn main() -> Result<()> {
    enable_raw_mode()?;
    stdout().execute(EnterAlternateScreen)?;
    let mut terminal = Terminal::new(CrosstermBackend::new(stdout()))?;

    let mut app = App::new()?;
    app.load_todos()?;

    loop {
        terminal.draw(|frame| ui(frame, &app))?;

        if let Event::Key(key) = event::read()? {
            match app.input_mode {
                InputMode::Normal => match key.code {
                    KeyCode::Char('q') => break,
                    KeyCode::Char('i') => app.input_mode = InputMode::Editing,
                    KeyCode::Char('j') | KeyCode::Down => {
                        if let Some(selected) = app.selected {
                            if selected < app.todos.len().saturating_sub(1) {
                                app.selected = Some(selected + 1);
                                app.list_state.select(Some(selected + 1));
                            }
                        } else if !app.todos.is_empty() {
                            app.selected = Some(0);
                            app.list_state.select(Some(0));
                        }
                    }
                    KeyCode::Char('k') | KeyCode::Up => {
                        if let Some(selected) = app.selected {
                            if selected > 0 {
                                app.selected = Some(selected - 1);
                                app.list_state.select(Some(selected - 1));
                            }
                        }
                    }
                    KeyCode::Char('d') => {
                        if key.modifiers.contains(KeyModifiers::CONTROL) {
                            app.delete_selected_todo()?;
                        }
                    }
                    _ => {}
                },
                InputMode::Editing => match key.code {
                    KeyCode::Esc => app.input_mode = InputMode::Normal,
                    KeyCode::Enter => {
                        app.add_todo()?;
                        app.input_mode = InputMode::Normal;
                    }
                    KeyCode::Char(c) => {
                        app.input.push(c);
                    }
                    KeyCode::Backspace => {
                        app.input.pop();
                    }
                    _ => {}
                },
            }
        }
    }

    disable_raw_mode()?;
    stdout().execute(LeaveAlternateScreen)?;
    Ok(())
}

fn ui(frame: &mut Frame, app: &App) {
    let main_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Input
            Constraint::Min(0),    // Todo list
        ])
        .split(frame.area());

    // Input box
    let input_title = match app.input_mode {
        InputMode::Normal => "New Todo (Press 'i' to edit)",
        InputMode::Editing => "New Todo (Press Esc to cancel, Enter to save)",
    };
    
    let input = Paragraph::new(app.input.as_str())
        .block(Block::default().title(input_title).borders(Borders::ALL));
    frame.render_widget(input, main_layout[0]);

    // Todo list
    let todos: Vec<ListItem> = app
        .todos
        .iter()
        .map(|t| {
            ListItem::new(format!("{}", t.content))
        })
        .collect();

    let todos = List::new(todos)
        .block(Block::default().title("Todos").borders(Borders::ALL))
        .highlight_style(Style::default().bg(Color::Gray));

    frame.render_stateful_widget(todos, main_layout[1], &mut app.list_state.clone());
}