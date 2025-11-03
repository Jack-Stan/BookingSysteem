// Manual global types for Vue templates to avoid the language server writing
// into node_modules. This file mirrors the typical shims and is intentionally
// lightweight; Volar/TS will use it as the global types file.

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}
