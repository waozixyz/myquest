// storage-interface.ts
export interface StorageInterface {
  getTodos(day: string): Promise<Todo[]>;
  addTodo(todo: Todo): Promise<void>;
  deleteTodo(id: number): Promise<void>;
  exportData(): Promise<string>;
  importData(data: string): Promise<void>;
}

export interface Todo {
  id?: number;
  day: string;
  content: string;
}