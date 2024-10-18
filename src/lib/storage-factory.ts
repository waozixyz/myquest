// storage-factory.ts
import type { StorageInterface } from './storage-interface';

let storage: StorageInterface;

export async function getStorage(): Promise<StorageInterface> {
  if (!storage) {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      const { invoke } = await import('@tauri-apps/api/core');
      const { TauriStorage } = await import('./tauri-storage');
      storage = new TauriStorage();
    } else {
      const { WebStorage } = await import('./web-storage');
      storage = new WebStorage();
    }
  }
  return storage;
}
