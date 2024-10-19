declare global {
  interface Window {
    handleTelegramAuth: (user: any) => void;
    __TAURI__: any;
  }
}
export {};
