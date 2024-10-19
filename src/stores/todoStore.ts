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
      if (storage.isUserLoggedIn()) {
        await storage.sync();
        // Reload todos for all days
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        for (const day of days) {
          await todoStore.loadTodos(day);
        }
      } else {
        console.log("User is not logged in. Skipping sync.");
      }
    },
    exportData: async () => {
      await initStorage();
      return storage.exportData();
    },
    importData: async (data: string) => {
      await initStorage();
      
      // Parse the imported data
      const importedTodos = JSON.parse(data);
      
      // Update the store with the imported data
      update(state => {
        const newState = { ...state };
        importedTodos.forEach((todo: Todo) => {
          if (!newState[todo.day]) {
            newState[todo.day] = [];
          }
          newState[todo.day].push(todo);
        });
        return newState;
      });
    
      // Save the imported data to storage
      await storage.importData(data);
    
      // Attempt to sync if user is logged in
      if (storage.isUserLoggedIn()) {
        await todoStore.sync();
      } else {
        console.log("User is not logged in. Imported data will not be synced.");
      }
    }
  };
}

export const todoStore = createTodoStore();