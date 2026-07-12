import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
// `base` must match the GitHub Pages sub-path (https://<user>.github.io/graph-game/) for the
// production build so assets resolve; the dev server stays at root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/graph-game/' : '/',
  plugins: [svelte()],
}))
