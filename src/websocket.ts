/**
 * WebSocket types for SvelteKit hooks.server
 *
 * @example
 * ```ts
 * // hooks.server.ts
 * export const handle: Handle = async ({ event, resolve }) => {
 *   if (
 *     event.request.headers.get("upgrade")?.toLowerCase() === "websocket"
 *   ) {
 *     await event.platform.server.upgrade(event.platform.request);
 *     return new Response(null, { status: 101 });
 *   }
 *   return resolve(event);
 * };
 *
 * export const websocket: Bun.WebSocketHandler = {
 *   open(ws) {
 *     ws.send("Hello from SvelteKit + Bun!");
 *   },
 *   message(ws, message) {
 *     ws.send(message);
 *   },
 * };
 * ```
 */

export type { WebSocketHandler } from "./types.ts";

export type KitPlatform = {
  server: Bun.Server;
  request: Request;
};

export type KitServerWithWebsocket = {
  websocket?: () => unknown;
};

export function kitPlatform(server: Bun.Server, request: Request): KitPlatform {
  return { server, request };
}

export function websocketFromKitServer(
  server: KitServerWithWebsocket,
): Bun.WebSocketHandler | undefined {
  return (server.websocket?.() ?? undefined) as Bun.WebSocketHandler | undefined;
}
