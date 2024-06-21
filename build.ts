import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { unstable_dev } from "wrangler";
import app from "./src";
import { X_HONO_SSG_PARAMS_HEADER } from "./src/ssg";

import type { Hono } from "hono";

export const replaceUrlParam = (
  urlString: string,
  params: Record<string, string>,
) => {
  for (const [k, v] of Object.entries(params)) {
    const reg = new RegExp("/:" + k + "(?:{[^/]+})?");
    urlString = urlString.replace(reg, `/${v}`);
  }
  return urlString;
};

const filterStaticGenerateRoutes = (app: Hono<any, any, any>) => {
  const routes: { path: string }[] = [];
  for (const route of app.routes) {
    if (route.method === "GET" || route.method === "ALL") {
      routes.push(route);
    }
  }

  return routes;
};

const main = async () => {
  const worker = await unstable_dev("./src/index.tsx", {
    local: false,
    config: "./wrangler.toml",
    vars: {
      ["SSG_CONTEXT"]: true,
    },
    experimental: {
      disableExperimentalWarning: true,
    },
  });

  const ssgPaths = new Set<string>();
  const routes = filterStaticGenerateRoutes(app);
  for (const { path } of routes) {
    const res = await worker.fetch(path, {
      headers: { [X_HONO_SSG_PARAMS_HEADER]: "true" },
    });
    if (res.headers.get(X_HONO_SSG_PARAMS_HEADER) == "true") {
      const data = (await res.json()) as { params: Record<string, string>[] };
      for (const param of data.params) {
        ssgPaths.add(replaceUrlParam(path, param));
      }
    } else {
      ssgPaths.add(path);
    }
  }

  for (const url of Array.from(ssgPaths)) {
    const res = await worker.fetch(url);
    if (res.status !== 200) continue;

    const html = await res.text();
    const filename = `${join("dist", url === "/" ? "index" : url)}.html`;
    await mkdir(dirname(filename), { recursive: true });
    await writeFile(filename, html);
  }

  await worker.stop();
  process.exit(0);
};

void main();
