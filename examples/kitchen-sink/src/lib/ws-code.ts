export const upgradeSample = `export const handle: Handle = async ({ event, resolve }) => {
  const upgrade = event.request.headers.get('upgrade');
  if (upgrade?.toLowerCase() === 'websocket') {
    await event.platform.server.upgrade(event.platform.request);
    return new Response(null, { status: 101 });
  }
  return resolve(event);
};`;

export const websocketSample = `export const websocket: Bun.WebSocketHandler = {
  open(ws) {
    ws.send('Welcome!');
  },
  message(ws, message) {
    ws.send(message);
  }
};`;
