<script lang="ts">
    import { todoStore } from '../stores/todoStore';
    import { activeTab } from '../stores/uiStore';
    import type { Todo } from '../lib/storage-interface';
  
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    let newTodo = '';
  
    $: currentDay = days[$activeTab];
    $: todos = $todoStore[currentDay] || [];
  
    function addTodo() {
      if (newTodo.trim()) {
        todoStore.addTodo({ day: currentDay, content: newTodo.trim() });
        newTodo = '';
      }
    }
  
    function deleteTodo(todo: Todo) {
      todoStore.deleteTodo(todo);
    }
  </script>
  
  <div class="todo-list">
    <form on:submit|preventDefault={addTodo}>
      <input
        bind:value={newTodo}
        placeholder="Add a new todo..."
      />
      <button type="submit">Add</button>
    </form>
    <ul>
      {#each todos as todo}
        <li>
          {todo.content}
          <button on:click={() => deleteTodo(todo)}>Delete</button>
        </li>
      {/each}
    </ul>
  </div>
  
  <style>

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
  </style>
  