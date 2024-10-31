use anyhow::Result;
use chrono::{Local, Datelike};
use crossterm::{
    event::{self, Event, KeyCode, KeyModifiers},
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
    ExecutableCommand,
};
use ratatui::{
    prelude::*,
    widgets::{Block, Borders, List, ListItem, ListState, Paragraph, Tabs},
};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::io::stdout;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Todo {
    id: Option<i64>,
    day: String,
    content: String,
    done: bool,
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
    current_tab: usize,
    list_state: ListState,
    debug_total_todos: usize,
}

const DAYS: [&str; 7] = [
    "Monday ☽",    // Moon
    "Tuesday ♂",   // Mars
    "Wednesday ☿", // Mercury
    "Thursday ♃",  // Jupiter
    "Friday ♀",    // Venus
    "Saturday ♄",  // Saturn
    "Sunday ☉",    // Sun
];
impl App {
    fn new() -> Result<App> {
        let app_dir = dirs::data_dir()
            .unwrap()
            .join("xyz.waozi.myquest");
        
        std::fs::create_dir_all(&app_dir)?;
        let db_path = app_dir.join("todos.db");
        let conn = Connection::open(&db_path)?;
        
        // First create the basic table if it doesn't exist
        conn.execute(
            "CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                day TEXT NOT NULL,
                content TEXT NOT NULL
            )",
            [],
        )?;

        // Check if the 'done' column exists, add it if it doesn't
        let columns: Vec<String> = conn
            .prepare("PRAGMA table_info(todos)")?
            .query_map([], |row| Ok(row.get::<_, String>(1)?))?
            .collect::<Result<Vec<_>, _>>()?;

        if !columns.contains(&"done".to_string()) {
            conn.execute("ALTER TABLE todos ADD COLUMN done BOOLEAN NOT NULL DEFAULT 0", [])?;
        }

        // Create archive table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS archived_todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                day TEXT NOT NULL,
                content TEXT NOT NULL,
                completed_at TEXT NOT NULL
            )",
            [],
        )?;

        let mut list_state = ListState::default();
        list_state.select(None);
        
        let current_weekday = Local::now().weekday().num_days_from_monday() as usize;
        
        Ok(App {
            todos: Vec::new(),
            input: String::new(),
            selected: None,
            input_mode: InputMode::Normal,
            conn,
            current_tab: current_weekday,
            list_state,
            debug_total_todos: 0,
        })
    }

    fn get_current_day(&self) -> String {
        DAYS[self.current_tab].split_whitespace().next().unwrap().to_string()
    }

    fn debug_database_path(&self) -> String {
        dirs::data_dir()
            .unwrap()
            .join("xyz.waozi.myquest")
            .join("todos.db")
            .to_string_lossy()
            .to_string()
    }

    fn debug_info(&self) -> String {
        let db_path = self.debug_database_path();
        let todo_count = self.todos.len();
        let current_day = self.get_current_day();
        
        format!(
            "Debug Info:\n\
             DB Path: {}\n\
             Current Day: {}\n\
             Todos Loaded: {}\n\
             Total Todos in DB: {}\n\
             Current Tab: {}", 
            db_path, current_day, todo_count, self.debug_total_todos, self.current_tab
        )
    }
    fn load_todos(&mut self) -> Result<()> {
        let current_day = self.get_current_day();
        
        // Use COALESCE to handle the case where 'done' column might not exist in old rows
        let mut stmt = self.conn.prepare(
            "SELECT id, day, content, COALESCE(done, 0) as done FROM todos WHERE day = ?"
        )?;
        
        let all_todos: Vec<(i64, String, String, bool)> = self.conn
            .prepare("SELECT id, day, content, COALESCE(done, 0) as done FROM todos")?
            .query_map([], |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        
        self.debug_total_todos = all_todos.len();
        
        self.todos = stmt.query_map([current_day], |row| {
            Ok(Todo {
                id: Some(row.get(0)?),
                day: row.get(1)?,
                content: row.get(2)?,
                done: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
        
        Ok(())
    }

    fn add_todo(&mut self) -> Result<()> {
        if self.input.is_empty() {
            return Ok(());
        }

        let current_day = self.get_current_day();
        self.conn.execute(
            "INSERT INTO todos (day, content, done) VALUES (?, ?, 0)",
            (&current_day, &self.input),
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
                    if self.selected == Some(self.todos.len()) {
                        self.selected = self.todos.len().checked_sub(1);
                        self.list_state.select(self.selected);
                    }
                }
            }
        }
        Ok(())
    }

    fn archive_selected_todo(&mut self) -> Result<()> {
        if let Some(selected) = self.selected {
            if let Some(todo) = self.todos.get(selected) {
                if let Some(id) = todo.id {
                    let tx = self.conn.transaction()?;
                    
                    tx.execute(
                        "INSERT INTO archived_todos (day, content, completed_at) VALUES (?, ?, datetime('now'))",
                        (&todo.day, &todo.content),
                    )?;
                    
                    tx.execute("DELETE FROM todos WHERE id = ?", [id])?;
                    
                    tx.commit()?;
                    self.load_todos()?;
                    
                    if self.selected == Some(self.todos.len()) {
                        self.selected = self.todos.len().checked_sub(1);
                        self.list_state.select(self.selected);
                    }
                }
            }
        }
        Ok(())
    }

    fn edit_selected_todo(&mut self) -> Result<()> {
        if let Some(selected) = self.selected {
            if let Some(todo) = self.todos.get(selected) {
                self.input = todo.content.clone();
                if let Some(id) = todo.id {
                    self.conn.execute("DELETE FROM todos WHERE id = ?", [id])?;
                    self.load_todos()?;
                }
                self.input_mode = InputMode::Editing;
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
                    KeyCode::Tab | KeyCode::Right => {
                        app.current_tab = (app.current_tab + 1) % DAYS.len();
                        app.load_todos()?;
                    }
                    KeyCode::BackTab | KeyCode::Left => {
                        app.current_tab = (app.current_tab + DAYS.len() - 1) % DAYS.len();
                        app.load_todos()?;
                    }
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
                    KeyCode::Char('x') => {
                        app.archive_selected_todo()?;
                    }
                    KeyCode::Char('e') => {
                        app.edit_selected_todo()?;
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
            Constraint::Length(3),  // Tabs
            Constraint::Length(3),  // Input
            Constraint::Min(0),     // Todo list
            Constraint::Length(3),  // Help
            Constraint::Length(5),  // Debug info
        ])
        .split(frame.area());

    // Tabs with improved highlighting
    let tabs = Tabs::new(DAYS.to_vec())
        .block(Block::default().title("Days").borders(Borders::ALL))
        .select(app.current_tab)
        .highlight_style(
            Style::default()
                .bg(Color::Gray)
                .fg(Color::Black)
                .bold()
        )
        .style(Style::default().fg(Color::White));
    frame.render_widget(tabs, main_layout[0]);

    // Input box
    let input_title = match app.input_mode {
        InputMode::Normal => "New Todo (Press 'i' to edit)",
        InputMode::Editing => "New Todo (Press Esc to cancel, Enter to save)",
    };
    
    let input = Paragraph::new(app.input.as_str())
        .block(Block::default().title(input_title).borders(Borders::ALL))
        .style(match app.input_mode {
            InputMode::Normal => Style::default(),
            InputMode::Editing => Style::default().bg(Color::DarkGray),
        });
    frame.render_widget(input, main_layout[1]);

    // Todo list with improved styling
    let todos: Vec<ListItem> = app
        .todos
        .iter()
        .map(|t| {
            ListItem::new(t.content.clone())
                .style(Style::default().fg(Color::White))
        })
        .collect();

    let todos = List::new(todos)
        .block(Block::default()
            .title(format!("{} Todos", app.get_current_day()))
            .borders(Borders::ALL))
        .highlight_style(
            Style::default()
                .bg(Color::Gray)
                .fg(Color::Black)
                .bold()
        )
        .style(Style::default().fg(Color::White));

    frame.render_stateful_widget(todos, main_layout[2], &mut app.list_state.clone());

    // Help message
    let help = Paragraph::new(
        "Controls: ↑/k ↓/j to navigate | i to add | e to edit | x to archive | Ctrl+d to delete | q to quit"
    )
    .block(Block::default().borders(Borders::ALL))
    .style(Style::default().fg(Color::Blue));
    
    frame.render_widget(help, main_layout[3]);

    // Debug info
    let debug_info = Paragraph::new(app.debug_info())
        .block(Block::default().title("Debug Information").borders(Borders::ALL))
        .style(Style::default().fg(Color::Yellow));
    frame.render_widget(debug_info, main_layout[4]);
}
