/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API root, e.g. `http://localhost:8000/api` (no version segment). */
  readonly VITE_API_URL?: string;
  /** API version segment handled by Laravel route prefixes. Defaults to `v1`. */
  readonly VITE_API_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
