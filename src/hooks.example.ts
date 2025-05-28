// Example: src/hooks.server.ts in your SvelteKit app
// This shows how to implement WebSocket support with svelte-adapter-bun

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};

// Export WebSocket handlers for Bun adapter
export const handleWebsocket = {
  /**
   * Called when a WebSocket connection is opened
   */
  open(ws: any) {
  },

  /**
   * Called when a WebSocket message is received
   */
  message(ws: any, message: string | Buffer) {
    
    // Echo the message back
    if (typeof message === 'string') {
      ws.send(`Echo: ${message}`);
    } else {
      ws.send(message);
    }
    
    // Example: Broadcast to all connected clients
    // ws.publish('chat', message);
  },

  /**
   * Called when a WebSocket connection is closed
   */
  close(ws: any, code: number, reason: string) {
  },

  /**
   * Called when the WebSocket is ready to receive more data
   */
  drain(ws: any) {
  },

  /**
   * Optional: Handle HTTP -> WebSocket upgrade
   * Return true to upgrade the request to a WebSocket
   */
  upgrade(request: Request, server: any): boolean {
    const url = new URL(request.url);
    
    // Only upgrade requests to /ws or /ws/*
    if (url.pathname === '/ws' || url.pathname.startsWith('/ws/')) {
      // You can add authentication or other checks here
      const sessionId = request.headers.get('x-session-id');
      
      if (sessionId) {
        // Upgrade with custom data
        server.upgrade(request, {
          data: { sessionId, path: url.pathname }
        });
        return true;
      }
    }
    
    return false;
  }
};

// Example: Using topics/rooms for pub/sub
export const websocketRooms = {
  joinRoom(ws: any, room: string) {
    ws.subscribe(room);
  },
  
  leaveRoom(ws: any, room: string) {
    ws.unsubscribe(room);
  },
  
  broadcast(ws: any, room: string, message: any) {
    ws.publish(room, JSON.stringify(message));
  }
}; 