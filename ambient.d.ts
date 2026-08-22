/// <reference types="bun-types" />

/**
 * Pulled into the app by:
 *
 * ```ts
 * /// <reference types="@gkh/svelte-adapter-bun" />
 * ```
 *
 * Bun globals (`Bun.redis`, `Bun.file`, `Bun.sql`, …) come from `bun-types`.
 * `App.Platform` is the per-request object the adapter passes to `server.respond`.
 */
declare global {
  namespace App {
    interface Platform {
      server: Bun.Server;
      request: Request;
    }
  }
}
