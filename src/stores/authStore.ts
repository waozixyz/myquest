import { writable } from "svelte/store";
import { getStorage } from "../lib/storage-factory";
import type { TelegramUser } from "../lib/storage-interface";

function createAuthStore() {
  const { subscribe, set, update } = writable({
    isLoggedIn: false,
    username: "",
  });

  let storage: Awaited<ReturnType<typeof getStorage>>;

  async function initStorage() {
    if (!storage) {
      storage = await getStorage();
    }
  }

  return {
    subscribe,
    login: async (user: TelegramUser) => {
      await initStorage();
      const success = await storage.loginWithTelegram(user);
      if (success) {
        set({ isLoggedIn: true, username: user.first_name });
      }
      return success;
    },
    logout: async () => {
      await initStorage();
      storage.logout();
      set({ isLoggedIn: false, username: "" });
    },
    checkAuth: async () => {
      await initStorage();
      const isLoggedIn = storage.isUserLoggedIn();
      const username = storage.getUsername();
      set({ isLoggedIn, username });
    },
  };
}

export const authStore = createAuthStore();

// Convenience exports
export const isLoggedIn = {
  subscribe: (fn: (value: boolean) => void) =>
    authStore.subscribe((state) => fn(state.isLoggedIn)),
};

export const username = {
  subscribe: (fn: (value: string) => void) =>
    authStore.subscribe((state) => fn(state.username)),
};

export const { login, logout } = authStore;
