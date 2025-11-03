import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Use a relative base so built asset URLs are relative to index.html.
  // This prevents absolute `/assets/...` requests from breaking on certain
  // hosting setups (Netlify previews, subpaths) where absolute paths can
  // return the SPA fallback HTML and cause the MIME type error.
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
})
