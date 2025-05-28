import { env } from './env.ts';
import { createStaticHandler } from './static.ts';
import { createPrerenderedHandler } from './prerendered.ts';
import { getRequest, setResponse } from './platform.ts';

interface ServerConfig {
  manifestPath: string;
  prerenderedPaths: string[];
  xff_depth: number;
}

export async function createServer(config: ServerConfig) {
  // Dynamic imports - these files exist at runtime, not build time
  const { Server } = await import(config.manifestPath.replace('manifest.js', 'server/index.js'));
  const { manifest, prerendered } = await import(config.manifestPath);

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

  async function handler(request: Request) {
    try {
      // Try static assets first
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

  // Start the server
  const server_instance = Bun.serve({
    port,
    hostname: host,
    fetch: handler,
    error(error) {
      console.error('Server error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  console.log(`Server running on http://${host}:${port}`);

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