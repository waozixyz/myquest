// storage-interface.ts
export interface StorageInterface {
  getTodos(day: string): Promise<Todo[]>;
  addTodo(todo: Todo): Promise<void>;
  deleteTodo(id: number): Promise<void>;
  exportData(): Promise<string>;
  importData(data: string): Promise<void>;
  sync(): Promise<void>;
  loginWithTelegram(botName: string): Promise<void>;
  logout(): Promise<void>;
  isUserLoggedIn(): boolean;
  getUsername(): string;
  moveTodoToDay(todo: Todo, newDay: string): Promise<void>;
  updateTodoOrder(day: string, todos: Todo[]): Promise<void>;
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
  isDragging?: boolean;
}
