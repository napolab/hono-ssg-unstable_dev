import { defineConfig } from "vite";

import { relative } from "node:path";
import ssg from "@hono/vite-ssg";
import { Hono } from "hono";
import {} from "hono/router";
import { toSSG } from "hono/ssg";
import type { Plugin, ResolvedConfig } from "vite";
import { createServer } from "vite";
import { unstable_dev } from "wrangler";

type SSGOptions = {
  entry?: string;
};

export const defaultOptions: Required<SSGOptions> = {
  entry: "./src/index.tsx",
};

export const ssgBuild = (options?: SSGOptions): Plugin => {
  const virtualId = "virtual:ssg-void-entry";
  const resolvedVirtualId = "\0" + virtualId;

  const entry = options?.entry ?? defaultOptions.entry;
  let config: ResolvedConfig;
  return {
    name: "@hono/vite-ssg",
    apply: "build",
    async config() {
      return {
        build: {
          rollupOptions: {
            input: [virtualId],
          },
        },
      };
    },
    configResolved(resolved) {
      config = resolved;
    },
    resolveId(id) {
      if (id === virtualId) {
        return resolvedVirtualId;
      }
    },
    load(id) {
      if (id === resolvedVirtualId) {
        return 'console.log("suppress empty chunk message")';
      }
    },
    async generateBundle(_outputOptions, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (
          chunk.type === "chunk" &&
          chunk.moduleIds.includes(resolvedVirtualId)
        ) {
          delete bundle[chunk.fileName];
        }
      }

      // Create a server to load the module
      const server = await createServer({
        plugins: [],
        build: { ssr: true },
      });
      const module = await server.ssrLoadModule(entry);
      server.close();

      const app = module["default"] as Hono;

      if (!app) {
        throw new Error(
          `Failed to find a named export "default" from ${entry}`,
        );
      }

      const worker = await unstable_dev(entry, {
        local: false,
        config: "./wrangler.toml",
        experimental: {
          disableExperimentalWarning: true,
        },
      });
      const _app = new Hono();
      for (const route of app.routes) {
        _app.on(route.method, [route.path], async (c) => {
          const res = await worker.fetch(c.req.url);
          return res as unknown as Response;
        });
      }

      const outDir = config.build.outDir;

      const result = await toSSG(
        _app,
        {
          writeFile: async (path, data) => {
            // delegate to Vite to emit the file
            this.emitFile({
              type: "asset",
              fileName: relative(outDir, path),
              source: data,
            });
          },
          async mkdir() {
            return;
          },
        },
        { dir: outDir },
      );
      await worker.stop();

      if (!result.success) {
        throw result.error;
      }
    },
  };
};

export default defineConfig({
  plugins: [ssgBuild()],
});
