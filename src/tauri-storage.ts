// tauri-storage.ts
import { invoke } from "@tauri-apps/api/core";
import type { StorageInterface, Todo } from './storage-interface';

export class TauriStorage implements StorageInterface {
  async getTodos(day: string): Promise<Todo[]> {
    return await invoke('get_todos', { day });
  }

  async addTodo(todo: Todo): Promise<void> {
    await invoke('add_todo', { todo });
  }

  async deleteTodo(id: number): Promise<void> {
    await invoke('delete_todo', { id });
  }
}