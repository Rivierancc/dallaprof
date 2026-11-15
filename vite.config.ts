// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// The Face ID library (via tsyringe) needs the Reflect metadata polyfill loaded
// before it runs; the bundler may evaluate it before any app entry, so inject it
// directly into tsyringe's own module.
const reflectFirst = {
  name: "reflect-metadata-first",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (/node_modules[\\/]tsyringe[\\/].*\.js$/.test(id) && !code.includes("reflect-metadata")) {
      return { code: `import "reflect-metadata";\n${code}`, map: null };
    }
    return null;
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: { plugins: [reflectFirst] },
});
