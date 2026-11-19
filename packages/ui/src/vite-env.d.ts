/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SOCKET_URL?: string;
  readonly VITE_SMARTPHONE_URL?: string;
  readonly VITE_TV_URL?: string;
  readonly VITE_PUBLIC_URL?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_APP_ROLE?: 'tv' | 'smartphone';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
