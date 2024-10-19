<script lang="ts">
    import { activeTab } from "../stores/uiStore";
    import moonIcon from "../assets/moon.png";
    import marsIcon from "../assets/mars.png";
    import mercuryIcon from "../assets/mercury.png";
    import jupiterIcon from "../assets/jupiter.png";
    import venusIcon from "../assets/venus.png";
    import saturnIcon from "../assets/saturn.png";
    import sunIcon from "../assets/sun.png";
    import { onMount } from 'svelte';
   
    const days = [
      { name: "Monday", symbol: moonIcon },
      { name: "Tuesday", symbol: marsIcon },
      { name: "Wednesday", symbol: mercuryIcon },
      { name: "Thursday", symbol: jupiterIcon },
      { name: "Friday", symbol: venusIcon },
      { name: "Saturday", symbol: saturnIcon },
      { name: "Sunday", symbol: sunIcon },
    ];
   
    onMount(() => {
      const currentDay = new Date().getDay();
      const currentTabIndex = currentDay === 0 ? 6 : currentDay - 1;
      activeTab.set(currentTabIndex);
    });
   </script>
   
   <div class="tabs">
    {#each days as day, i}
      <button
        class:active={$activeTab === i}
        on:click={() => activeTab.set(i)}
        title={day.name}
      >
        <img src={day.symbol} alt={day.name} class="symbol" />
        <span class="name">{day.name}</span>
      </button>
    {/each}
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
        padding: 0.5rem 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        border-radius: 10px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: flex-start; /* Align content to the start */
    }
    .tabs button .symbol {
        width: 1.2em;
        height: 1.2em;
        margin-right: 0.5rem;
        filter: invert(1);
        transition: filter 0.3s ease; /* Smooth transition for color inversion */
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
            justify-content: center; /* Center the symbol on small screens */
        }
        .tabs button .symbol {
            margin-right: 0;
        }
    }
</style>
