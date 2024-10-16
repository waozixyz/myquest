<script lang="ts">
    export let isOpen: boolean;
    export let onClose: () => void;
    export let onExport: () => void;
    export let onImport: (event: Event) => void;
  </script>
  
  {#if isOpen}
    <div class="modal-overlay active">
      <div class="modal">
        <h2>Settings</h2>
        <div class="modal-content">
          <button on:click={onExport}>Export</button>
          <label for="import-file" class="import-label">
            Import
            <input
              type="file"
              id="import-file"
              accept=".json"
              on:change={onImport}
              style="display: none;"
            />
          </label>
        </div>
        <button class="close-button" on:click={onClose}>Close</button>
      </div>
    </div>
  {/if}
  
  <style>

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(10, 10, 42, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
  backdrop-filter: blur(5px);
}

.modal-overlay.active {
  opacity: 1;
  visibility: visible;
}

.modal {
  background: linear-gradient(135deg, #1a1a4a, #2a1a5a);
  border-radius: 20px;
  padding: 2rem;
  max-width: 90%;
  width: 400px;
  box-shadow: 0 0 30px rgba(255, 58, 134, 0.3);
  transform: scale(0.9) translateY(-20px);
  opacity: 0;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-overlay.active .modal {
  transform: scale(1) translateY(0);
  opacity: 1;
  animation: modalFloat 4s ease-in-out infinite;
}

.modal h2 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal button {
  width: 100%;
}

.close-button {
  margin-top: 1rem;
  background-color: var(--accent-color);
}

.close-button:hover {
  background-color: #ff1a4b;
}

/* Import Label */
.import-label {
  display: inline-block;
  padding: 0.5rem 1rem;
  background-color: var(--secondary-color);
  color: var(--text-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.import-label:hover {
  background-color: var(--hover-color);
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(255, 58, 134, 0.3);
}
  </style>
