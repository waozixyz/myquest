use anyhow::Result;
use crossterm::{
    event::{self, Event, KeyCode},
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
    ExecutableCommand,
};
use ratatui::{
    prelude::*,
    widgets::{Block, Borders, List, ListItem, Paragraph},
};
use std::io::stdout;

struct Todo {
    title: String,
    completed: bool,
}

struct App {
    todos: Vec<Todo>,
    input: String,
    selected: Option<usize>,
}

impl App {
    fn new() -> App {
        App {
            todos: Vec::new(),
            input: String::new(),
            selected: None,
        }
    }

    fn add_todo(&mut self, title: String) {
        self.todos.push(Todo {
            title,
            completed: false,
        });
    }
}

fn main() -> Result<()> {
    // Setup terminal
    enable_raw_mode()?;
    stdout().execute(EnterAlternateScreen)?;
    let mut terminal = Terminal::new(CrosstermBackend::new(stdout()))?;

    // Create app state
    let mut app = App::new();

    // Main loop
    loop {
        terminal.draw(|frame| ui(frame, &app))?;

        if let Event::Key(key) = event::read()? {
            match key.code {
                KeyCode::Char('q') => break,
                KeyCode::Char(c) => {
                    app.input.push(c);
                }
                KeyCode::Enter => {
                    if !app.input.is_empty() {
                        app.add_todo(app.input.clone());
                        app.input.clear();
                    }
                }
                KeyCode::Backspace => {
                    app.input.pop();
                }
                _ => {}
            }
        }
    }

    // Cleanup terminal
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
        .split(frame.size());

    // Input box
    let input = Paragraph::new(app.input.as_str())
        .block(Block::default().title("New Todo").borders(Borders::ALL));
    frame.render_widget(input, main_layout[0]);

    // Todo list
    let todos: Vec<ListItem> = app
        .todos
        .iter()
        .map(|t| {
            let status = if t.completed { "✓" } else { " " };
            ListItem::new(format!("[{}] {}", status, t.title))
        })
        .collect();

    let todos = List::new(todos)
        .block(Block::default().title("Todos").borders(Borders::ALL));
    frame.render_widget(todos, main_layout[1]);
}