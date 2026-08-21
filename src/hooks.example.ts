// Example: src/hooks.server.ts in your SvelteKit app
// This shows how to implement WebSocket support with svelte-adapter-bun

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.headers.get('connection')?.toLowerCase().includes('upgrade') &&
    request.headers.get('upgrade')?.toLowerCase() === 'websocket' &&
    url.pathname.startsWith('/ws')
  ) {
    await event.platform.server.upgrade(event.platform.request);
    return new Response(null, { status: 101 });
  }

  return resolve(event);
};

export const websocket: Bun.WebSocketHandler = {
  open(ws) {
    ws.send('Welcome!');
  },
  message(ws, message) {
    ws.send(message);
  },
  close() {},
};
