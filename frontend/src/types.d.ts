// Lightweight module declarations to quiet editor 'Cannot find module' diagnostics
// These are intentionally permissive — they avoid blocking editor UX while
// proper types are available via node_modules. Remove if full typings are
// resolved (installing packages and restarting the TS/Vue servers).

declare module 'axios'
declare module 'vite'
declare module '@vitejs/plugin-vue'
