<script lang="ts">
    import { onMount } from "svelte";
    import { todoStore } from "../stores/todoStore";
    import {
      activeTab,
      notification,
    } from "../stores/uiStore";
    import { modalStore } from "../stores/modalStore";
    import TodoList from "../components/TodoList.svelte";
    import HeaderActions from "../components/HeaderActions.svelte";
    import Modal from "../components/Modal.svelte";
    import SettingsModal from "../components/SettingsModal.svelte";
    import InfoModal from "../components/InfoModal.svelte";
    import SignInModal from "../components/SignInModal.svelte";
   
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
   
    onMount(async () => {
      await todoStore.loadTodos(days[$activeTab]);
    });
   
    $: {
      todoStore.loadTodos(days[$activeTab]);
    }
   </script>
   
   <div class="container">
     <div class="header">
       <h1>{days[$activeTab]}</h1>
       <HeaderActions />
     </div>
     <TodoList />
     {#if $notification.message}
       <div class="notification {$notification.type}">
         {$notification.message}
       </div>
     {/if}
   </div>
   
   <Modal>
     {#if $modalStore.type === "settings"}
       <SettingsModal />
     {:else if $modalStore.type === "info"}
       <InfoModal />
     {:else if $modalStore.type === "signIn"}
       <SignInModal />
     {/if}
   </Modal>
   
   <style>
     .container {
        max-width: 800px;
        width: 90%;
        padding: 2rem;
        background-color: rgba(20, 20, 40, 0.8);
        border-radius: 20px;
        box-shadow: 0 0 30px rgba(255, 58, 134, 0.3);
        backdrop-filter: blur(10px);
        margin-top: 0;
    }
     .header {
       display: flex;
       justify-content: space-between;
       align-items: center;
       margin-bottom: 1rem;
     }
     .notification {
       position: fixed;
       bottom: 20px;
       right: 20px;
       padding: 10px 20px;
       border-radius: 5px;
       color: white;
       font-weight: bold;
     }
     .notification.success {
       background-color: #4caf50;
     }
     .notification.error {
       background-color: #f44336;
     }
     @media (max-width: 600px) {
      .container {
        width: 95%;
        padding:1rem;
        margin: 0 auto;
      }
    
     }
   </style>