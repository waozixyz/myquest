<script lang="ts">
    import { todoStore } from "../stores/todoStore";
    import { modalStore } from "../stores/modalStore";
    import { onMount } from "svelte";
    import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
    import { save, open } from '@tauri-apps/plugin-dialog';
    
    let isTauri = false;
    
    onMount(() => {
      if (typeof window !== "undefined" && window.__TAURI__) {
        isTauri = true;
      }
    });
    
    async function exportData() {
      const data = await todoStore.exportData();
      if (isTauri) {
        // Tauri version
        try {
          const filePath = await save({
            filters: [{
              name: 'JSON',
              extensions: ['json']
            }],
            defaultPath: 'todos_export.json'
          });
          
          if (filePath) {
            await writeTextFile(filePath, data);
          }
        } catch (err) {
          console.error("Failed to save file:", err);
        }
      } else {
        // Web version
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "todos_export.json";
        a.click();
        URL.revokeObjectURL(url);
      }
    }
    
    async function importData() {
      if (isTauri) {
        try {
          const filePath = await open({
            multiple: false,
            filters: [{
              name: 'JSON',
              extensions: ['json']
            }]
          });
          
          if (filePath) {
            const data = await readTextFile(filePath as string);
            await todoStore.importData(data);
            modalStore.close();
          }
        } catch (err) {
          console.error("Failed to import file:", err);
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                try {
                    const data = e.target?.result as string;
                    const parsedData = JSON.parse(data);
                    await todoStore.importData(JSON.stringify(parsedData));
                    modalStore.close();
                } catch (error) {
                    console.error("Failed to parse or import data:", error);
                    alert("Failed to import data. Please make sure the file is valid JSON.");
                }
                };
                reader.readAsText(file);
            }
        };
        input.click();
      }
    }
    </script>
    
    <h2>Settings</h2>
    <button on:click={exportData}>Export</button>
    <button on:click={importData}>Import</button>
    
    <style>
    button {
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
      font-size: 1rem;
      font-family: inherit;
    }
    button:hover {
      background-color: var(--hover-color);
    }
    </style>