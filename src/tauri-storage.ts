import { invoke } from "@tauri-apps/api/core";
import type { StorageInterface, TelegramUser, Todo } from './storage-interface';

export class TauriStorage implements StorageInterface {
  private isLoggedIn: boolean = false;
  private username: string = '';

  constructor() {
    this.loadAuthState();
  }

  private async loadAuthState(): Promise<void> {
    try {
      const authState: { isLoggedIn: boolean; username: string } = await invoke('get_auth_state');
      this.isLoggedIn = authState.isLoggedIn;
      this.username = authState.username;
    } catch (error) {
      console.error('Failed to load auth state:', error);
    }
  }

  async getTodos(day: string): Promise<Todo[]> {
    return await invoke('get_todos', { day });
  }

  async addTodo(todo: Todo): Promise<void> {
    await invoke('add_todo', { todo });
  }

  async deleteTodo(id: number): Promise<void> {
    await invoke('delete_todo', { id });
  }

  async exportData(): Promise<string> {
    return await invoke('export_data');
  }

  async importData(data: string): Promise<void> {
    await invoke('import_data', { data });
  }

  async loginWithTelegram(user: TelegramUser): Promise<boolean> {
    try {
      const result: { success: boolean; username: string } = await invoke('login_with_telegram', { user });
      if (result.success) {
        this.isLoggedIn = true;
        this.username = result.username;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Telegram login failed:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    await invoke('logout');
    this.isLoggedIn = false;
    this.username = '';
  }

  isUserLoggedIn(): boolean {
    return this.isLoggedIn;
  }

  getUsername(): string {
    return this.username;
  }

  async sync(): Promise<void> {
    if (!this.isUserLoggedIn()) {
      throw new Error('User is not logged in');
    }
    await invoke('sync_todos');
  }
}