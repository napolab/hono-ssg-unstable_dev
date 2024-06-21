import type { Context, Env, MiddlewareHandler } from "hono";

export const X_HONO_SSG_PARAMS_HEADER = "x-hono-ssg-params";
type SSGParams = Record<string, string> | Record<string, string>[];

export const ssgParams =
  <E extends Env = Env, P extends string = string, I extends {} = {}>(
    handler: (c: Context<E, P, I>) => Promise<SSGParams> | SSGParams,
  ): MiddlewareHandler<E, P, I> =>
  async (c, next) => {
    if (c.req.header(X_HONO_SSG_PARAMS_HEADER) === "true") {
      const result = await handler(c);

      return c.json(
        { params: Array.isArray(result) ? result : [result] },
        { headers: { [X_HONO_SSG_PARAMS_HEADER]: "true" } },
      );
    } else {
      await next();
    }
  };
