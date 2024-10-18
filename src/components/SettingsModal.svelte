<script lang="ts">
    import { todoStore } from "../stores/todoStore";
    import { modalStore } from "../stores/modalStore";

    async function exportData() {
        const data = await todoStore.exportData();
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "todos_export.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    async function importData(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = e.target?.result as string;
                await todoStore.importData(data);
                modalStore.close();
            };
            reader.readAsText(file);
        }
    }
</script>

<h2>Settings</h2>
<button on:click={exportData}>Export</button>
<label for="import-file" class="import-label">
    Import
    <input
        type="file"
        id="import-file"
        accept=".json"
        on:change={importData}
        style="display: none;"
    />
</label>

<style>
    button,
    .import-label {
        display: block;
        width: 100%;
        padding: 0.5rem 0;
        margin-bottom: 1rem;
        background-color: var(--secondary-color);
        color: var(--text-color);
        border: none;
        border-radius: 5px;
        cursor: pointer;
        text-align: center;
    }
    button:hover,
    .import-label:hover {
        background-color: var(--hover-color);
    }
</style>
