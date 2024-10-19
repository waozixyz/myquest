<script lang="ts">
    import { onMount } from "svelte";
    import TelegramLogin from "./TelegramLogin.svelte";
    import { login } from "../stores/authStore";

    async function handleTelegramAuth(user: any) {
        await login(user);
    }

    let isLoading = true;

    onMount(() => {
        const timer = setTimeout(() => {
            isLoading = false;
        }, 3000); // Show loader for 3 seconds
        return () => clearTimeout(timer);
    });
</script>

<h2>Sign In</h2>

{#if isLoading}
    <div class="loader"></div>
{/if}

<div class:visually-hidden={isLoading}>
    <TelegramLogin botName="w_myquest_bot" onAuth={handleTelegramAuth} />
</div>

<style>
    .loader {
        border: 4px solid var(--secondary-color);
        border-top: 4px solid var(--accent-color);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 20px auto;
    }
    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
    .visually-hidden {
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    }
</style>
