export interface Todo {
  id?: number;
  day: string;
  content: string;
  lastModified?: string;
}

export interface StorageInterface {
  getTodos(day: string): Promise<Todo[]>;
  addTodo(todo: Todo, broadcast?: boolean): Promise<void>;
  deleteTodo(id: number, broadcast?: boolean): Promise<void>;
  moveTodoToDay(todo: Todo, newDay: string, broadcast?: boolean): Promise<void>;
  updateTodoOrder(day: string, todos: Todo[], broadcast?: boolean): Promise<void>;
  connectPeer(peerId?: string): Promise<string>;
  disconnectPeer(): Promise<void>;
  isPeerConnected(): boolean;
  getPeerId(): string | null;
  getSyncStatus(): 'disconnected' | 'connecting' | 'connected';
  sync(): Promise<void>;
  exportData(): Promise<string>;
  importData(data: string): Promise<void>;
}