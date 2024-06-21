## Overview

This prototype repository demonstrates the integration of Cloudflare bindings with the Hono static site generator (SSG) using the `unstable_dev` branch. It explores binding assignments during the SSG process with a focus on using Cloudflare's D1 database.

## Getting Started

1. **Installation**: Execute `bun i` to install dependencies.
2. **Configuration**: Update the `wrangler.toml` for the D1 database ID, and set environment variables in a `.env` file:

   ```plaintext
   CLOUDFLARE_ACCOUNT_ID=your_account_id_here
   ```

3. **Build and Test**:
   - Use `bun run build` to build and verify the outcomes.
   - Launch the development server with `bun run dev`.

## index.tsx Code Explanation

The `index.tsx` is the main entry file for the Hono application, integrating a D1 database via Drizzle ORM:

```typescript
import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as schema from "./schema";
import { ssgParams } from "./ssg";

type Env = {
  Bindings: {
    BUN_VERSION: "1.1.7";
    DB: D1Database;
  };
  Variables: {
    db: DrizzleD1Database<typeof schema>;
  };
};

const app = new Hono<Env>();
app.use(async (c, next) => {
  const db = drizzle(c.env?.DB, { schema });
  c.set("db", db);
  return next();
});

app.get("/", (c) => {
  return c.render(
    <html>
      <head>
        <title>Home</title>
      </head>
      <body>
        <h1>Welcome to Hono!</h1>
      </body>
    </html>,
  );
});

app.get(
  "/posts/:id",
  ssgParams<Env>(async (c) => {
    const posts = await c.var.db.query.posts.findMany();
    return posts.map((post) => ({ id: post.id }));
  }),
  async (c) => {
    const post = await c.var.db.query.posts.findFirst({
      where(fields, { eq }) {
        return eq(fields.id, c.req.param("id"));
      },
    });

    if (!post) {
      return c.notFound();
    }

    return c.render(
      <html>
        <head>
          <title>{post.title}</title>
        </head>
        <body>
          <h1>{post.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </body>
      </html>,
    );
  },
);

export default app;
```

## Monitoring and Documentation

- **Known Issue**: `getPlatformProxy` method was unusable due to connection issues. Monitor [GitHub issue #5105](https://github.com/cloudflare/workers-sdk/issues/5105) for updates.
- **Further Reading**: Detailed guide on `unstable_dev` can be found in the [documentation](https://developers.cloudflare.com/workers/wrangler/api/#unstable_dev).

## Output Contents

- **index.html**

```html
<html>
  <head>
    <title>Home</title>
  </head>
  <body>
    <h1>Welcome to Hono!</h1>
  </body>
</html>
```

- **remote.html**

```html
<html>
  <head>
    <title>REMOTE_DAYOOO</title>
  </head>
  <body>
    <h1>REMOTE_DAYOOO</h1>
    <div>
      <section>
        <h2>unstable_dev で hono/ssg でも D1 を使う</h2>
        <p>確認用</p>
      </section>
    </div>
  </body>
</html>
```
