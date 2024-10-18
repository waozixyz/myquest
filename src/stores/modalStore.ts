import { writable } from 'svelte/store';

export type ModalType = 'settings' | 'info' | 'signIn';

interface ModalState {
  isOpen: boolean;
  type: ModalType | null;
}

function createModalStore() {
  const { subscribe, set, update } = writable<ModalState>({
    isOpen: false,
    type: null,
  });

  return {
    subscribe,
    open: (type: ModalType) => update(state => ({ isOpen: true, type })),
    close: () => set({ isOpen: false, type: null }),
  };
}

export const modalStore = createModalStore();
