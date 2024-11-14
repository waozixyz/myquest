<script lang="ts">
  import { todoStore } from '../stores/todoStore';
  import { activeTab } from '../stores/uiStore';
  import type { Todo } from '../lib/storage-interface';
  import { findDropIndex, isWithinExpandedRect } from '../utils/todoUtils';
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
  let dropIndex: number | null = null;

  let touchStartY: number | null = null;
  let touchStartX: number | null = null;

  function addTodo() {
    if (newTodo.trim()) {
      todoStore.addTodo({ day: currentDay, content: newTodo.trim() });
      newTodo = '';
    }
  }

  function deleteTodo(todo: Todo) {
    todoStore.deleteTodo(todo);
  }

  function handleDragStart(e: DragEvent, todo: Todo) {
    draggedTodo = todo;
    e.dataTransfer!.effectAllowed = "move";
    if (todo.id) {
      e.dataTransfer!.setData("text", todo.id.toString());
    }
    const dragImage = e.target as HTMLElement;
    e.dataTransfer!.setDragImage(dragImage, 0, 0);
  }

  function handleDragOver(e: DragEvent, todo: Todo, index: number) {
    e.preventDefault();
    if (draggedTodo && draggedTodo !== todo) {
      const newDropIndex = findDropIndex(e, index, todos.length);
      if (newDropIndex !== dropIndex) {
        dropIndex = newDropIndex;
      }
    }
  }

  function handleTabDragOver(e: DragEvent, day: string) {
    e.preventDefault();
    const tabElement = e.currentTarget as HTMLElement;
    const rect = tabElement.getBoundingClientRect();

    if (isWithinExpandedRect(e, rect)) {
      draggedOverDay = day;
    } else {
      draggedOverDay = null;
    }
  }

  function handleDragDrop(e: DragEvent, zone: string) {
    e.preventDefault();
    if (draggedTodo) {
      if (zone !== 'todo-list' && zone !== currentDay) {
        todoStore.moveTodoToDay(draggedTodo, zone);
      } else if (dropIndex !== null && draggedTodo !== null) {
        const oldIndex = todos.findIndex(t => t.id === draggedTodo!.id);
        let newIndex = dropIndex;
        if (oldIndex < newIndex) newIndex--;
        
        if (oldIndex !== newIndex) {
          const updatedTodos = [...todos];
          const [removed] = updatedTodos.splice(oldIndex, 1);
          updatedTodos.splice(newIndex, 0, removed);
          todoStore.reorderTodos(currentDay, updatedTodos);
        }
      }
    }
    draggedOverDay = null;
    dropIndex = null;
  }

  function handleDragEnd(e: DragEvent) {
    draggedTodo = null;
    draggedOverDay = null;
    dropIndex = null;
  }

  function handleDragLeave() {
    dropIndex = null;
  }

  function handleTouchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
  }

  function handleTouchMove(e: TouchEvent) {
    if (touchStartY === null || touchStartX === null) return;

    const touchEndY = e.touches[0].clientY;
    const touchEndX = e.touches[0].clientX;
    const deltaY = touchStartY - touchEndY;
    const deltaX = touchStartX - touchEndX;

    // If the horizontal movement is greater than the vertical movement, prevent default
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
    }
  }

</script>

<div class="tabs">
  {#each days as day, i}
    <button
      role="tab"
      class:active={$activeTab === i}
      class:dragover={draggedOverDay === day.name}
      on:click={() => activeTab.set(i)}
      on:dragover|preventDefault={(e) => handleTabDragOver(e, day.name)}
      on:drop={(e) => handleDragDrop(e, day.name)}
      title={day.name}
      data-day={day.name}
      draggable="false"
    >
      <img src={day.symbol} alt={day.name} class="symbol"draggable="false" />
      <span class="name">{day.name}</span>
    </button>
  {/each}
</div>

<div 
  class="todo-list"
  role="region"
  aria-label="Todo list"
  on:dragover|preventDefault
  on:drop={(e) => handleDragDrop(e, 'todo-list')}
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
>
  <form aria-label="Add new todo" on:submit|preventDefault={addTodo}>
    <input bind:value={newTodo} placeholder="Add a new todo..." />
    <button type="submit">Add</button>
  </form>
  <ul>
    {#each todos as todo, index (todo.id)}
      {#if index === dropIndex && draggedTodo !== todo}
        <li class="drop-placeholder"></li>
      {/if}
      <li 
        draggable={true}
        on:dragstart={(e) => handleDragStart(e, todo)}
        on:dragend={handleDragEnd}
        on:dragover|preventDefault={(e) => handleDragOver(e, todo, index)}
        class:dragging={draggedTodo === todo}
        data-id={todo.id}
      >
        <span class="drag-handle">&#8942;</span>
        <span class="todo-content">{todo.content}</span>
        <button on:click={() => deleteTodo(todo)}>Delete</button>
      </li>
    {/each}
    {#if dropIndex === todos.length}
      <li class="drop-placeholder"></li>
    {/if}
  </ul>
</div>

<style>
  

form button {
    background-color: var(--accent-color);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    cursor: pointer;
    border-radius: 0 10px 10px 0;
    transition: all 0.3s ease;
    animation: pulse 2s infinite;
}

form button:hover {
    background-color: #ff1a4b;
    transform: scale(1.05);
}

.todo-list li,
  .todo-list li * {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  .todo-list input {
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
  }

  .drop-placeholder {
    height: 2rem;
    background-color: transparent;
    transition: all 0.2s ease;
  }

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
    overflow-x: hidden;
    max-width: 100%;
    touch-action: pan-y;
  }

  .todo-list ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  .todo-list li {
    display: flex;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    transition: transform 0.2s ease;
    touch-action: none;
  }
  .todo-list form {
    margin-bottom: 1.5rem;  /* Adds space below the form */
  }

  .todo-list li:last-child {
    border-bottom: none;
  }

  .todo-list li:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  .todo-list li.dragging {
    opacity: 0.5;
    transform: scale(0.95);
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

  .todo-list li.dragging {
    opacity: 0.5;
    transform: scale(0.95);
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

  @media (max-width: 650px) {
    .todo-list {
      padding: 1rem;
    }


    .todo-content {
      width: 100%;
      margin-bottom: 0.5rem;
    }

    .todo-list li button {
      margin-left: auto;
    }

    .tabs {
      flex-wrap: wrap;
      justify-content: center;
    }
  
    .tabs button {
      flex: 1 0 auto;
      max-width: calc(25% - 0.5rem);
      margin: 0.25rem;
    }
  
    .tabs button .name {
      display: none;
    }
  
    .tabs button .symbol {
      margin-right: 0;
    }
  }
  
</style>