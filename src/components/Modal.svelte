<script lang="ts">
    import { modalStore } from "../stores/modalStore";
    import { fade, fly } from "svelte/transition";
    import { onMount } from "svelte";

    let modalElement: HTMLDialogElement;

    function closeModal() {
        modalStore.close();
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            closeModal();
        }
    }
    // Add this function
    function handleSubmit(event: Event) {
        event.preventDefault();
        // Add any form submission logic here if needed
    }

    onMount(() => {
        if (modalElement) {
            modalElement.focus();
        }
    });
</script>

{#if $modalStore.isOpen}
    <div
        class="modal-overlay"
        on:click={closeModal}
        transition:fade={{ duration: 200 }}
        role="presentation"
    >
        <dialog
            class="modal"
            transition:fly={{ y: -50, duration: 200 }}
            open
            bind:this={modalElement}
            aria-labelledby="modal-title"
            aria-modal="true"
        >
            <form
                method="dialog"
                on:submit={handleSubmit}
                on:click|stopPropagation
            >
                <h2 id="modal-title"><slot name="title"></slot></h2>
                <div class="modal-content">
                    <slot></slot>
                </div>
                <button
                    type="button"
                    class="close-button"
                    on:click={closeModal}
                    aria-label="Close modal"
                >
                    ×
                </button>
            </form>
        </dialog>
    </div>
{/if}

<style>
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
        z-index: 1000;
        backdrop-filter: blur(5px);
    }
    .modal {
        display: flex;
        background: linear-gradient(135deg, #1a1a4a, #2a1a5a);
        border-radius: 20px;
        padding: 2rem;
        max-width: 90%;
        width: 400px;
        box-shadow: 0 0 30px rgba(255, 58, 134, 0.3);
        border: none;
    }
    .modal-content {
        max-height: 80vh;
        overflow-y: auto;
    }
    .close-button {
        position: absolute;
        top: -1.5rem;
        right: -1.5rem;
        background: none;
        border: none;
        color: var(--text-color);
        font-size: 2rem;
        line-height: 1;
        cursor: pointer;
        transition: color 0.3s ease;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .close-button:hover {
        color: var(--accent-color);
    }
</style>
