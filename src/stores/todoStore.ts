import { writable } from 'svelte/store';
import type { Todo } from '../lib/storage-interface';
import { getStorage } from '../lib/storage-factory';

function createTodoStore() {
  const { subscribe, update, set } = writable<{ [day: string]: Todo[] }>({});

  let storage: Awaited<ReturnType<typeof getStorage>>;

  async function initStorage() {
    if (!storage) {
      storage = await getStorage();
    }
  }

  return {
    subscribe,
    loadTodos: async (day: string) => {
      await initStorage();
      const todos = await storage.getTodos(day);
      update(state => ({ ...state, [day]: todos }));
    },
    addTodo: async (todo: Todo) => {
      await initStorage();
      await storage.addTodo(todo);
      await todoStore.loadTodos(todo.day);
    },
    deleteTodo: async (todo: Todo) => {
      if (todo.id !== undefined) {
        await initStorage();
        await storage.deleteTodo(todo.id);
        await todoStore.loadTodos(todo.day);
      }
    },
    sync: async () => {
      await initStorage();
      await storage.sync();
      // Reload todos for all days
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      for (const day of days) {
        await todoStore.loadTodos(day);
      }
    },
    exportData: async () => {
      await initStorage();
      return storage.exportData();
    },
    importData: async (data: string) => {
      await initStorage();
      await storage.importData(data);
      // Reload todos for all days after import
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      for (const day of days) {
        await todoStore.loadTodos(day);
      }
    }
  };
}

export const todoStore = createTodoStore();
