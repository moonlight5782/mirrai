declare module "cloudflare:workers" {
  export const env: { DB?: D1Database; [key: string]: unknown };
}

interface Fetcher {
  fetch(input: Request): Promise<Response>;
}

type D1Database = import("@miniflare/d1").D1Database;
