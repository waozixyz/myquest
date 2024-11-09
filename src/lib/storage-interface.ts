export interface StorageInterface {
  getTodos(day: string): Promise<Todo[]>;
  addTodo(todo: Todo): Promise<void>;
  deleteTodo(id: number): Promise<void>;
  exportData(): Promise<string>;
  importData(data: string): Promise<void>;
  sync(): Promise<void>;
  connectPeer(peerId?: string): Promise<string>;
  disconnectPeer(): Promise<void>;
  isPeerConnected(): boolean;
  getPeerId(): string | null;
  moveTodoToDay(todo: Todo, newDay: string): Promise<void>;
  updateTodoOrder(day: string, todos: Todo[]): Promise<void>;
}

export interface Todo {
  id?: number;
  day: string;
  content: string;
  isDragging?: boolean;
}
