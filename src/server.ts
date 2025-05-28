import { env } from './env.ts';
import { createStaticHandler } from './static.ts';
import { createPrerenderedHandler } from './prerendered.ts';
import { getRequest, setResponse } from './platform.ts';
import type { WebSocketConfig, WebSocketHandler } from './types.ts';

interface ServerConfig {
  manifestPath: string;
  prerenderedPaths: string[];
  xff_depth: number;
  websocket?: WebSocketConfig;
}

export async function createServer(config: ServerConfig) {
  // Dynamic imports - these files exist at runtime, not build time
  const { Server } = await import(config.manifestPath.replace('manifest.js', 'server/index.js'));
  const { manifest, prerendered } = await import(config.manifestPath);

  // Try to load WebSocket handler from user's hooks.server.js at runtime using Function constructor
  let handleWebsocket: WebSocketHandler | undefined;
  if (config.websocket?.enabled) {
    try {
      // Use dynamic evaluation to avoid TypeScript import resolution
      const importHooks = new Function('return import("./server/chunks/hooks.server.js").catch(() => null)');
      const hooks = await importHooks();
      handleWebsocket = hooks?.handleWebsocket;
      if (handleWebsocket) {
        console.log('WebSocket handler loaded from hooks.server.js');
      }
    } catch (error) {
      // No WebSocket handler - that's fine
    }
  }

  // Initialize SvelteKit server
  const server = new Server(manifest);
  await server.init({ env: process.env });

  const port = parseInt(env('PORT', '3000') as string);
  const host = env('HOST', '0.0.0.0') as string;

  // Configuration
  const origin = process.env.ORIGIN;
  const address_header = (env('ADDRESS_HEADER', '') ?? '').toLowerCase();
  const protocol_header = (env('PROTOCOL_HEADER', '') ?? '').toLowerCase();
  const host_header = (env('HOST_HEADER', 'host') ?? 'host').toLowerCase();
  const port_header = (env('PORT_HEADER', '') ?? '').toLowerCase();

  // Create handlers
  const staticHandler = createStaticHandler();
  const prerenderedHandler = createPrerenderedHandler(prerendered);

  async function svelteKitHandler(request: Request) {
    const svelteRequest = await getRequest({
      request,
      origin,
      xff_depth: config.xff_depth,
      address_header,
      protocol_header,
      host_header,
      port_header
    });
    
    const response = await server.respond(svelteRequest, {
      getClientAddress() {
        return svelteRequest.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
      },
      platform: { isBun: () => true }
    });
    
    return setResponse(response);
  }

  async function handler(request: Request, server: any) {
    try {
      // Try WebSocket upgrade first if we have a handleWebsocket hook
      if (handleWebsocket && config.websocket?.enabled) {
        const upgrade = request.headers.get('upgrade');
        
        if (upgrade?.toLowerCase() === 'websocket') {
          // Use the handleWebsocket.upgrade method to determine if we should upgrade
          if (handleWebsocket.upgrade) {
            const shouldUpgrade = await handleWebsocket.upgrade(request, (req: Request) => {
              return server.upgrade(req, {
                data: { 
                  path: new URL(req.url).pathname,
                  handler: handleWebsocket 
                }
              });
            });
            
            if (shouldUpgrade) {
              return; // Successfully upgraded
            }
          } else {
            // Default upgrade behavior - upgrade all WebSocket requests
            const success = server.upgrade(request, {
              data: { 
                path: new URL(request.url).pathname,
                handler: handleWebsocket 
              }
            });
            
            if (success) {
              return; // Successfully upgraded
            } else {
              return new Response('WebSocket upgrade failed', { status: 400 });
            }
          }
        }
      }

      // Try static assets
      const staticResponse = await staticHandler(request);
      if (staticResponse) return staticResponse;

      // Try prerendered pages
      const prerenderedResponse = await prerenderedHandler(request);
      if (prerenderedResponse) return prerenderedResponse;

      // Fall back to SvelteKit
      return await svelteKitHandler(request);
    } catch (error) {
      console.error('Server error:', error);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: { 'content-type': 'text/plain' }
      });
    }
  }

  // Start the server with WebSocket support
  const serverOptions: any = {
    port,
    hostname: host,
    fetch: handler,
    error(error: Error) {
      console.error('Server error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  };

  // Add WebSocket configuration if enabled and we have a handler
  if (config.websocket?.enabled && handleWebsocket) {
    serverOptions.websocket = {
      async message(ws: any, message: string | Buffer) {
        const wsHandler = ws.data?.handler;
        if (wsHandler?.message) {
          try {
            await wsHandler.message(ws, message);
          } catch (error) {
            console.error('WebSocket message error:', error);
          }
        }
      },
      
      async open(ws: any) {
        const wsHandler = ws.data?.handler;
        if (wsHandler?.open) {
          try {
            await wsHandler.open(ws);
          } catch (error) {
            console.error('WebSocket open error:', error);
          }
        }
      },
      
      async close(ws: any, code?: number, reason?: string) {
        const wsHandler = ws.data?.handler;
        if (wsHandler?.close) {
          try {
            await wsHandler.close(ws, code, reason);
          } catch (error) {
            console.error('WebSocket close error:', error);
          }
        }
      },
      
      async drain(ws: any) {
        const wsHandler = ws.data?.handler;
        if (wsHandler?.drain) {
          try {
            await wsHandler.drain(ws);
          } catch (error) {
            console.error('WebSocket drain error:', error);
          }
        }
      },
      
      // Bun WebSocket options
      compression: config.websocket.compression ?? true,
      maxCompressedSize: config.websocket.maxCompressedSize ?? 64 * 1024,
      maxBackpressure: config.websocket.maxBackpressure ?? 16 * 1024 * 1024,
    };
  }

  const server_instance = Bun.serve(serverOptions);

  console.log(`Server running on http://${host}:${port}`);
  if (config.websocket?.enabled && handleWebsocket) {
    console.log('WebSocket support enabled');
  }

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    server_instance.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server_instance;
} 