<script lang="ts">
  import { writable, type Writable } from 'svelte/store';
  import { getStorage } from '../storage-factory';
  import type { Todo } from '../storage-interface';
  
  interface Day {
    name: string;
    symbol: string;
    todos: Writable<Todo[]>;
  }
  
  let activeTab = 0;
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
  
  async function initStorage() {
    storage = await getStorage();
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
  
  $: {
    loadTodos(days[activeTab].name);
  }
  
  $: activeDayTodos = days[activeTab].todos;
  </script>

  <div class="container">
    <h1>{days[activeTab].name} Todos</h1>
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
  </div>