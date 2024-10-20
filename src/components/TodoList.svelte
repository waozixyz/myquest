<script lang="ts">
  import { todoStore } from '../stores/todoStore';
  import { activeTab } from '../stores/uiStore';
  import type { Todo } from '../lib/storage-interface';
  import moonIcon from "../assets/moon.png";
  import marsIcon from "../assets/mars.png";
  import mercuryIcon from "../assets/mercury.png";
  import jupiterIcon from "../assets/jupiter.png";
  import venusIcon from "../assets/venus.png";
  import saturnIcon from "../assets/saturn.png";
  import sunIcon from "../assets/sun.png";
 
  const days = [
    { name: "Monday", symbol: moonIcon },
    { name: "Tuesday", symbol: marsIcon },
    { name: "Wednesday", symbol: mercuryIcon },
    { name: "Thursday", symbol: jupiterIcon },
    { name: "Friday", symbol: venusIcon },
    { name: "Saturday", symbol: saturnIcon },
    { name: "Sunday", symbol: sunIcon },
  ];

  let newTodo = '';
  $: currentDay = days[$activeTab].name;
  $: todos = $todoStore[currentDay] || [];

  let draggedTodo: Todo | null = null;
  let draggedOverDay: string | null = null;
  let dragOverTodo: Todo | null = null;
  let status = '';

  function addTodo() {
    if (newTodo.trim()) {
      todoStore.addTodo({ day: currentDay, content: newTodo.trim() });
      newTodo = '';
    }
  }

  function deleteTodo(todo: Todo) {
    todoStore.deleteTodo(todo);
  }

function handleDragEnter(e: DragEvent, zone: string) {
  if (zone !== 'todo-list') {
    draggedOverDay = zone;
    status = `Dragging over ${zone}`;
  }
}

function handleDragLeave(e: DragEvent, zone: string) {
  if (zone !== 'todo-list') {
    draggedOverDay = null;
    status = 'Dragging within todo list';
  }
}

function handleDragOver(e: DragEvent, todo: Todo) {
  e.preventDefault();
  if (draggedTodo && draggedTodo !== todo) {
    dragOverTodo = todo;
  }
}

function handleDragDrop(e: DragEvent, zone: string) {
  e.preventDefault();
  if (draggedTodo) {
    if (zone !== 'todo-list') {
      // Move to another day
      todoStore.moveTodoToDay(draggedTodo, zone);
      status = `Moved task to ${zone}`;
    } else {
      // Reorder within the list
      const oldIndex = todos.findIndex(t => t.id === draggedTodo.id);
      const newIndex = todos.findIndex(t => t.id === dragOverTodo?.id);
      
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const updatedTodos = [...todos];
        const [removed] = updatedTodos.splice(oldIndex, 1);
        updatedTodos.splice(newIndex, 0, removed);
        todoStore.reorderTodos(currentDay, updatedTodos);
        status = 'Reordered task';
      }
    }
  }
  draggedOverDay = null;
  dragOverTodo = null;
}

function handleDragStart(e: DragEvent, todo: Todo) {
  draggedTodo = todo;
  status = 'Started dragging task';
  e.dataTransfer!.effectAllowed = "move";
  e.dataTransfer!.setData("text", todo.id);
  
  const dragImage = e.target as HTMLElement;
  e.dataTransfer!.setDragImage(dragImage, 0, 0);
}

function handleDragEnd(e: DragEvent) {
  if (!e.dataTransfer?.dropEffect || e.dataTransfer.dropEffect === 'none') {
    status = 'Cancelled dragging';
  }
  draggedTodo = null;
  draggedOverDay = null;
  dragOverTodo = null;
}
</script>

<h2 id="app_status">Drag status: {status}</h2>

<div class="tabs">
  {#each days as day, i}
    <button
      class:active={$activeTab === i}
      class:dragover={draggedOverDay === day.name}
      on:click={() => activeTab.set(i)}
      on:dragenter={(e) => handleDragEnter(e, day.name)}
      on:dragleave={(e) => handleDragLeave(e, day.name)}
      on:drop={(e) => handleDragDrop(e, day.name)}
      on:dragover|preventDefault
      title={day.name}
      data-day={day.name}
    >
      <img src={day.symbol} alt={day.name} class="symbol" />
      <span class="name">{day.name}</span>
    </button>
  {/each}
</div>
<div 
  class="todo-list"
  on:dragover|preventDefault
  on:drop={(e) => handleDragDrop(e, 'todo-list')}
>
  <form on:submit|preventDefault={addTodo}>
    <input bind:value={newTodo} placeholder="Add a new todo..." />
    <button type="submit">Add</button>
  </form>
  <ul>
    {#each todos as todo (todo.id)}
      <li 
        draggable={true}
        on:dragstart={(e) => handleDragStart(e, todo)}
        on:dragend={handleDragEnd}
        on:dragover|preventDefault={(e) => handleDragOver(e, todo)}
        class:dragging={draggedTodo === todo}
        class:dragover={draggedTodo !== todo && dragOverTodo === todo}
        data-id={todo.id}
      >
        <span class="drag-handle">&#8942;</span>
        <span class="todo-content">{todo.content}</span>
        <button on:click={() => deleteTodo(todo)}>Delete</button>
      </li>
    {/each}
  </ul>
</div>

<style>
.tabs {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.tabs button {
  background-color: var(--secondary-color);
  color: var(--text-color);
  border: none;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.tabs button .symbol {
  width: 1.2em;
  height: 1.2em;
  margin-right: 0.5rem;
  filter: invert(1);
  transition: filter 0.2s ease;
}

.tabs button:hover {
  transform: scale(0.95);
}

.tabs button.active {
  background-color: var(--accent-color);
}

.tabs button.dragover {
  background-color: var(--accent-color);
  box-shadow: 0 0 8px rgba(255, 58, 134, 0.4);
}

.todo-list {
  background-color: rgba(30, 30, 60, 0.6);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.todo-list ul {
  list-style-type: none;
  padding: 0;
}

.todo-list li {
  display: flex;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background-color 0.2s ease;
}

.todo-list li:last-child {
  border-bottom: none;
}

.todo-list li:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.drag-handle {
  cursor: move;
  padding: 0 10px;
  font-size: 1.2em;
  color: var(--secondary-color);
}

.todo-content {
  flex-grow: 1;
  padding: 0 10px;
}

.todo-list li button {
  background-color: transparent;
  color: var(--text-color);
  border: 1px solid var(--text-color);
  padding: 5px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.todo-list li button:hover {
  background-color: var(--text-color);
  color: var(--secondary-color);
}

.todo-list li.dragover {
  border-top: 2px solid var(--accent-color);
}
.todo-list li.dragging {
  opacity: 0.5;
}

@media (max-width: 850px) {
  .tabs {
    flex-wrap: wrap;
    justify-content: space-around;
  }
  .tabs button .name {
    display: none;
  }
  .tabs button {
    padding: 0.5rem;
    justify-content: center;
  }
  .tabs button .symbol {
    margin-right: 0;
  }
}
 </style>