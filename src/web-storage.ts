// web-storage.ts
import type { StorageInterface, Todo } from './storage-interface';

export class WebStorage implements StorageInterface {
  private getStorageKey(day: string): string {
    return `todos_${day}`;
  }

  async getTodos(day: string): Promise<Todo[]> {
    const storageKey = this.getStorageKey(day);
    const todosJson = localStorage.getItem(storageKey);
    return todosJson ? JSON.parse(todosJson) : [];
  }

  async addTodo(todo: Todo): Promise<void> {
    const todos = await this.getTodos(todo.day);
    todo.id = Date.now();  // Simple way to generate unique IDs
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
}