<script lang="ts">
    import { onMount } from 'svelte';
  
    export let botName: string;
    export let onAuth: (user: any) => void;
  
    let buttonRef: HTMLDivElement;
  
    onMount(() => {
      const script = document.createElement('script');
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute('data-telegram-login', botName);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      buttonRef.appendChild(script);
  
      window.onTelegramAuth = (user: any) => {
        onAuth(user);
      };
  
      return () => {
        delete window.onTelegramAuth;
      };
    });
  </script>
  
  <div bind:this={buttonRef}></div>