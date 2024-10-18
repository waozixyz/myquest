<script lang="ts">
    import { activeTab } from "../stores/uiStore";

    const days = [
        { name: "Monday", symbol: "🌙" },
        { name: "Tuesday", symbol: "♂" },
        { name: "Wednesday", symbol: "☿" },
        { name: "Thursday", symbol: "♃" },
        { name: "Friday", symbol: "♀" },
        { name: "Saturday", symbol: "♄" },
        { name: "Sunday", symbol: "☉" },
    ];
</script>

<div class="tabs">
    {#each days as day, i}
        <button
            class:active={$activeTab === i}
            on:click={() => activeTab.set(i)}
            title={day.name}
        >
            <span class="symbol">{day.symbol}</span>
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
