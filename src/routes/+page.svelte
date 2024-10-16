<script lang="ts">
  import { writable, type Writable } from 'svelte/store';
  import { getStorage } from '../storage-factory';
  import type { Todo } from '../storage-interface';
  import TopNav from '../components/TopNav.svelte';
  import SettingsModal from '../components/SettingsModal.svelte';
  
  const notification = writable({ message: '', type: '' });

  function showNotification(message: string, type: 'success' | 'error') {
    notification.set({ message, type });
    setTimeout(() => notification.set({ message: '', type: '' }), 3000);
  }

  interface Day {
    name: string;
    symbol: string;
    todos: Writable<Todo[]>;
  }

  let settingsModal = false;
  let activeTab = new Date().getDay();
  const days: Day[] = [
    { name: 'Monday', symbol: '🌙', todos: writable([]) },
    { name: 'Tuesday', symbol: '♂', todos: writable([]) },
    { name: 'Wednesday', symbol: '♀', todos: writable([]) },
    { name: 'Thursday', symbol: '♃', todos: writable([]) },
    { name: 'Friday', symbol: '♀', todos: writable([]) },
    { name: 'Saturday', symbol: '♄', todos: writable([]) },
    { name: 'Sunday', symbol: '☉', todos: writable([]) },
  ];

  let newTodo = '';
  let storage: Awaited<ReturnType<typeof getStorage>>;
  let isLoggedIn = false;
  let username = '';
  
  async function initStorage() {
    storage = await getStorage();
    isLoggedIn = storage.isUserLoggedIn();
    username = storage.getUsername();
  }
  
  async function exportData() {
    if (!storage) await initStorage();
    const data = await storage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'todos_export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function syncTodos() {
    if (isLoggedIn && storage) {
      try {
        await storage.sync();
        await loadTodos(days[activeTab].name);
        showNotification('Todos synced successfully!', 'success');
      } catch (error) {
        console.error('Sync failed:', error);
        showNotification('Sync failed. Please try again.', 'error');
      }
    }
  }

  async function importData(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as string;
          if (!storage) await initStorage();
          await storage.importData(data);
          await loadTodos(days[activeTab].name);
          showNotification('Import successful!', 'success');
        } catch (error) {
          console.error('Error importing data:', error);
          showNotification('Import failed. Please check your file and try again.', 'error');
        }
      };
      reader.readAsText(file);
    }
    closeSettings();
  }

  async function loadTodos(day: string) {
    try {
      if (!storage) await initStorage();
      const todos: Todo[] = await storage.getTodos(day);
      days.find(d => d.name === day)?.todos.set(todos);
    } catch (error) {
      console.error('Error loading todos:', error);
    }
  }
  
  async function addTodo() {
    if (newTodo.trim()) {
      const todo: Todo = {
        day: days[activeTab].name,
        content: newTodo.trim()
      };
      try {
        if (!storage) await initStorage();
        await storage.addTodo(todo);
        await loadTodos(days[activeTab].name);
        newTodo = '';
      } catch (error) {
        console.error('Error adding todo:', error);
      }
    }
  }
  
  async function deleteTodo(todo: Todo) {
    if (todo.id !== undefined) {
      try {
        if (!storage) await initStorage();
        await storage.deleteTodo(todo.id);
        await loadTodos(days[activeTab].name);
      } catch (error) {
        console.error('Error deleting todo:', error);
      }
    } else {
      console.error('Cannot delete todo without an ID');
    }
  }
  
  function openSettings() {
    settingsModal = true;
  }

  function closeSettings() {
    settingsModal = false;
  }

  async function logout() {
    if (!storage) await initStorage();
    await storage.logout();
    isLoggedIn = false;
    username = '';
    showNotification('Logged out successfully!', 'success');
    await loadTodos(days[activeTab].name);
  }

  async function handleTelegramAuth(user: any) {
    if (!storage) await initStorage();
    const success = await storage.loginWithTelegram(user);
    if (success) {
      isLoggedIn = true;
      username = user.first_name;
      await syncTodos();
      showNotification('Logged in successfully!', 'success');
    } else {
      showNotification('Login failed. Please try again.', 'error');
    }
  }

  $: {
    loadTodos(days[activeTab].name);
  }
  
  $: activeDayTodos = days[activeTab].todos;

  initStorage();
</script>

<TopNav 
  {isLoggedIn}
  {username}
  onSyncTodos={syncTodos}
  onLogoutClick={logout}
  onSettingsClick={openSettings}
  onTelegramAuth={handleTelegramAuth}
/>

<div class="container">
  <h1>{days[activeTab].name}</h1>
  <div class="tabs">
    {#each days as day, i}
      <button 
        class:active={activeTab === i} 
        on:click={() => activeTab = i}
        title={day.name}
      >
        <span class="symbol">{day.symbol}</span>
        <span class="name">{day.name}</span>
      </button>
    {/each}
  </div>
  <div class="todo-list">
    <form on:submit|preventDefault={addTodo}>
      <input
        bind:value={newTodo}
        placeholder="Add a new todo..."
      />
      <button type="submit">Add</button>
    </form>
    <ul>
      {#each $activeDayTodos as todo}
        <li>
          {todo.content}
          <button on:click={() => deleteTodo(todo)}>Delete</button>
        </li>
      {/each}
    </ul>
  </div>
  {#if $notification.message}
    <div class="notification {$notification.type}">
      {$notification.message}
    </div>
  {/if}
</div>

<SettingsModal
  isOpen={settingsModal}
  onClose={closeSettings}
  onExport={exportData}
  onImport={importData}
/>


<style>

/* Tabs */
.tabs {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.tabs button {
  background-color: var(--secondary-color);
  color: var(--text-color);
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 10px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tabs button .symbol {
  font-size: 1.2em;
  margin-right: 0.5rem;
}

.tabs button:hover {
  background-color: var(--hover-color);
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(255, 58, 134, 0.3);
}

.tabs button.active {
  background-color: var(--accent-color);
  box-shadow: 0 0 20px rgba(255, 58, 134, 0.5);
}

/* Todo List */
.todo-list {
  background-color: rgba(30, 30, 60, 0.8);
  padding: 1rem;
  border-radius: 15px;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--secondary-color);
  animation: fadeIn 0.5s ease;
}


.tabs button .symbol {
  font-size: 1.2em;
  margin-right: 0.5rem;
}


/* Responsive Design */
@media (max-width: 600px) {
  .tabs {
    flex-wrap: wrap;
    justify-content: space-around;
  }

  .tabs button .name {
    display: none;
  }

  .tabs button {
    padding: 0.5rem;
  }

  .tabs button .symbol {
    margin-right: 0;
  }

}
</style>
