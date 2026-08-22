import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Config de teste isolada de propósito: o vite.config.ts do app usa o wrapper
// @lovable.dev/vite-tanstack-config, que injeta plugins de build/SSR que não
// devem rodar sob o Vitest. Aqui só precisamos do alias "@" e do ambiente DOM.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/achados.ts", "src/lib/documentos.ts"],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 85 },
    },
  },
});
