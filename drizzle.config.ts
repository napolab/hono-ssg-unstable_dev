import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema/*",
  dbCredentials: {
    url: ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/8ffed13f87633307dad0500526fc61f5e3c77fa1f4c61c78f8602aea9753801a.sqlite",
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
});
