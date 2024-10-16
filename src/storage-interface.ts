// storage-interface.ts
export interface StorageInterface {
  getTodos(day: string): Promise<Todo[]>;
  addTodo(todo: Todo): Promise<void>;
  deleteTodo(id: number): Promise<void>;
  exportData(): Promise<string>;
  importData(data: string): Promise<void>;
  sync(): Promise<void>;
  loginWithTelegram(user: TelegramUser): Promise<boolean>;
  logout(): void;
  isUserLoggedIn(): boolean;
  getUsername(): string;
}


export interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface Todo {
  id?: number;
  day: string;
  content: string;
}
