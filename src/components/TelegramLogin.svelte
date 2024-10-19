<script lang="ts">
    import { onMount } from "svelte";
    import { isLoggedIn, login } from "../stores/authStore";

    export let botName: string;
    export let onAuth: (user: any) => void;

    let isTauri = false;
    let telegramLoginContainer: HTMLDivElement;

    onMount(async () => {
        if (typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
            isTauri = true;
            const { onOpenUrl } = await import("@tauri-apps/plugin-deep-link");
            await onOpenUrl((url) => {
                const params = new URLSearchParams(url.split("?")[1]);
                const user = Object.fromEntries(params);
                handleAuth(user);
            });
        } else {
            // Web version: Load Telegram script
            const script = document.createElement("script");
            script.src = "https://telegram.org/js/telegram-widget.js?22";
            script.setAttribute("data-telegram-login", botName);
            script.setAttribute("data-size", "large");
            script.setAttribute(
                "data-onauth",
                "window.handleTelegramAuth(user)",
            );
            script.setAttribute("data-request-access", "write");
            telegramLoginContainer.appendChild(script);

            // Add global handler
            window.handleTelegramAuth = handleAuth;
        }
    });

    function handleAuth(user: any) {
        onAuth(user);
    }

    async function openTelegramLogin() {
        if (isTauri) {
            const { invoke } = await import("@tauri-apps/api/core");
            await invoke("open_telegram_login", { botName });
        }
    }
</script>

{#if isTauri}
    <button on:click={openTelegramLogin}>Login with Telegram</button>
{:else}
    <div bind:this={telegramLoginContainer}></div>
{/if}
