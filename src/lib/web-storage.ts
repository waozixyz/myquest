import type { StorageInterface, Todo, TelegramUser } from './storage-interface';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export class WebStorage implements StorageInterface {
  private isLoggedIn: boolean = false;
  private authToken: string = '';
  private username: string = '';

  constructor() {
    this.loadAuthState();
  }

  private getStorageKey(day: string): string {
    return `todos_${day}`;
  }

  private loadAuthState(): void {
    const storedToken = localStorage.getItem('authToken');
    const storedUsername = localStorage.getItem('username');
    if (storedToken && storedUsername) {
      this.authToken = storedToken;
      this.username = storedUsername;
      this.isLoggedIn = true;
    }
  }
  async updateTodoOrder(day: string, todos: Todo[]): Promise<void> {
    localStorage.setItem(this.getStorageKey(day), JSON.stringify(todos));
  }
  async getTodos(day: string): Promise<Todo[]> {
    const storageKey = this.getStorageKey(day);
    const todosJson = localStorage.getItem(storageKey);
    console.log(`Getting todos for ${day}. Raw data:`, todosJson);
    const todos = todosJson ? JSON.parse(todosJson) : [];
    console.log(`Parsed todos for ${day}:`, todos);
    return todos;
  }

  async addTodo(todo: Todo): Promise<void> {
    const todos = await this.getTodos(todo.day);
    todo.id = Date.now();
    todos.push(todo);
    localStorage.setItem(this.getStorageKey(todo.day), JSON.stringify(todos));
  }

  async deleteTodo(id: number): Promise<void> {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of days) {
      const todos = await this.getTodos(day);
      const updatedTodos = todos.filter(todo => todo.id !== id);
      if (updatedTodos.length !== todos.length) {
        localStorage.setItem(this.getStorageKey(day), JSON.stringify(updatedTodos));
        break;
      }
    }
  }

  async exportData(): Promise<string> {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let allTodos: Todo[] = [];
    for (const day of days) {
      const dayTodos = await this.getTodos(day);
      allTodos = allTodos.concat(dayTodos);
      console.log(allTodos)
      console.log(day)

    }
    return JSON.stringify(allTodos);
  }

  async importData(data: string): Promise<void> {
    console.log('Importing data:', data);
    const importedData: Todo[] = JSON.parse(data);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of days) {
      const dayTodos = importedData.filter(todo => todo.day === day);
      console.log(`Importing todos for ${day}:`, dayTodos);
      localStorage.setItem(this.getStorageKey(day), JSON.stringify(dayTodos));
    }
    console.log('Import completed. LocalStorage updated.');
  }

  async loginWithTelegram(user: TelegramUser): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/telegram-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important for CORS with authentication
        body: JSON.stringify(user)
      });
  
      if (!response.ok) {
        throw new Error('Login failed');
      }
  
      const data = await response.json();
      this.isLoggedIn = true;
      this.authToken = data.token;
      this.username = user.first_name;
      localStorage.setItem('authToken', this.authToken);
      localStorage.setItem('username', this.username);
      return true;
    } catch (error) {
      console.error('Telegram login failed:', error);
      return false;
    }
  }

  logout(): void {
    this.isLoggedIn = false;
    this.authToken = '';
    this.username = '';
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
  }

  async sync(): Promise<void> {
    if (!this.isLoggedIn || !this.authToken) {
      throw new Error('User is not logged in');
    }

    try {
      const allTodos = await this.getAllTodos();
      const response = await fetch(`${API_URL}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(allTodos)
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const updatedTodos: Todo[] = await response.json();
      await this.updateLocalStorage(updatedTodos);
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  isUserLoggedIn(): boolean {
    return this.isLoggedIn;
  }

  getUsername(): string {
    return this.username;
  }
  async moveTodoToDay(todo: Todo, newDay: string): Promise<void> {
    // Remove todo from the current day
    let currentDayTodos = await this.getTodos(todo.day);
    currentDayTodos = currentDayTodos.filter(t => t.id !== todo.id);
    localStorage.setItem(this.getStorageKey(todo.day), JSON.stringify(currentDayTodos));
  
    // Add todo to the new day
    const newDayTodos = await this.getTodos(newDay);
    const updatedTodo = { ...todo, day: newDay };
    newDayTodos.push(updatedTodo);
    localStorage.setItem(this.getStorageKey(newDay), JSON.stringify(newDayTodos));
  }
  private async getAllTodos(): Promise<Todo[]> {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let allTodos: Todo[] = [];
    for (const day of days) {
      const todos = await this.getTodos(day);
      allTodos = allTodos.concat(todos);
    }
    return allTodos;
  }

  private async updateLocalStorage(todos: Todo[]): Promise<void> {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of days) {
      const dayTodos = todos.filter(todo => todo.day === day);
      localStorage.setItem(this.getStorageKey(day), JSON.stringify(dayTodos));
    }
  }
}