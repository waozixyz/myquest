<script lang="ts">
    import TelegramLogin from "./TelegramLogin.svelte";
    import { login } from "../stores/authStore";

    async function handleTelegramAuth(user: any) {
        await login(user);
    }
</script>

<h2>Sign In</h2>
<TelegramLogin botName="w_myquest_bot" onAuth={handleTelegramAuth} />
