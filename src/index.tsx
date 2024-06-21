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

// index.tsx
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
    console.debug(
      "posts",
      posts.map((post) => post.id),
    );

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
