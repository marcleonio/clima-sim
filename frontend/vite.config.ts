// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/*
 * `ssr.noExternal: true` é necessário no build (empacota as dependências
 * CommonJS junto, que é o que faz a imagem rodar na VPS), mas quebra o
 * `vite dev`: no SSR de desenvolvimento o mesmo ajuste faz o runner avaliar
 * módulos CJS sem o `module` no escopo, e a página morre com
 * "ReferenceError: module is not defined" antes de renderizar.
 *
 * Por isso ele vale só quando estamos construindo.
 */
const ehBuild = process.argv.includes("build");

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    build: {
      rollupOptions: {
        // Evita que o rollup fragmente e crie dependências circulares nos chunks do SSR.
        // O cast existe porque o tipo de `output` no preset não admite a forma de
        // objeto — o comportamento é o mesmo, só o tipo é estreito demais.
        output: { manualChunks: undefined } as Record<string, unknown>,
      },
    },
    // A chave é omitida em dev, não posta como `false`: o resolvedor só aceita
    // `true` ou uma lista, e `false` derruba o servidor na largada.
    ssr: ehBuild ? { noExternal: true } : {},
  },
});
