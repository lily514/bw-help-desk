// Vite's `?raw` imports (the Worker is bundled by Vite), e.g. the handbook for Reset.
declare module '*.md?raw' {
  const text: string
  export default text
}
