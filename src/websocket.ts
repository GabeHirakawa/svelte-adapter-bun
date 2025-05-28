/**
 * WebSocket types for SvelteKit hooks.server.js
 * 
 * @example
 * ```js
 * // hooks.server.js
 * 
 * /** @type {import("@gkh/svelte-adapter-bun").WebSocketHandler} *\/
 * export const handleWebsocket = {
 *   open(ws) {
 *     console.log("WebSocket opened");
 *     ws.send("Hello from SvelteKit + Bun!");
 *   },
 *   
 *   message(ws, message) {
 *     console.log("Received:", message);
 *     ws.send(`Echo: ${message}`);
 *   },
 *   
 *   upgrade(request, upgrade) {
 *     const url = new URL(request.url);
 *     if (url.pathname.startsWith("/ws")) {
 *       return upgrade(request);
 *     }
 *     return false;
 *   }
 * };
 * ```
 */

// Export types from the source files
export type { WebSocketHandler, WebSocketConfig } from './types.ts'; 