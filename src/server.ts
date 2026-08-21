import { env, listenFromEnv } from './env.ts';
import { createStaticHandler } from './static.ts';
import { createPrerenderedHandler } from './prerendered.ts';
import { getRequest, setResponse } from './platform.ts';
import { kitPlatform, websocketFromKitServer } from './websocket.ts';
import { clientAddress } from './client-address.ts';
import { serveAssetsEnabled, xffDepthFromBuild } from './asset.ts';
import { serveLimits } from './serve-limits.ts';

interface ServerConfig {
  manifestPath: string;
  prerenderedPaths: string[];
}

export async function createServer(config: ServerConfig) {
  // Dynamic imports - these files exist at runtime, not build time
  const { Server } = await import(config.manifestPath.replace('manifest.js', 'server/index.js'));
  const { manifest, prerendered } = await import(config.manifestPath);

  // Initialize SvelteKit server
  const server = new Server(manifest);
  await server.init({ env: process.env });
  const websocket = websocketFromKitServer(server);

  const listen = listenFromEnv(typeof ENV_PREFIX === "undefined" ? "" : ENV_PREFIX, Bun.env);

  // Configuration
  const origin = env('ORIGIN');
  const address_header = (env('ADDRESS_HEADER', '') ?? '').toLowerCase();
  const protocol_header = (env('PROTOCOL_HEADER', '') ?? '').toLowerCase();
  const host_header = (env('HOST_HEADER', 'host') ?? 'host').toLowerCase();
  const port_header = (env('PORT_HEADER', '') ?? '').toLowerCase();
  const buildOptions = typeof BUILD_OPTIONS === "undefined" ? {} : BUILD_OPTIONS;
  const xff_depth = Number.parseInt(env("XFF_DEPTH", xffDepthFromBuild(buildOptions)), 10);
  const limits = serveLimits({
    BODY_SIZE_LIMIT: env("BODY_SIZE_LIMIT", "512K"),
    IDLE_TIMEOUT: env("IDLE_TIMEOUT", "10"),
  });
  const staticHandler = serveAssetsEnabled(buildOptions) ? createStaticHandler() : async () => null;
  const prerenderedHandler = serveAssetsEnabled(buildOptions)
    ? createPrerenderedHandler(prerendered)
    : async () => null;

  async function svelteKitHandler(request: Request, bunServer: Bun.Server) {
    const svelteRequest = await getRequest({
      request,
      origin,
      protocol_header,
      host_header,
      port_header
    });
    
    const response = await server.respond(svelteRequest, {
      getClientAddress() {
        return clientAddress({
          request,
          addressHeader: address_header,
          xffDepth: xff_depth,
          requestIP: bunServer.requestIP(request)?.address,
        });
      },
      platform: kitPlatform(bunServer, request)
    });
    
    return setResponse(response);
  }

  async function handler(request: Request, bunServer: Bun.Server) {
    try {
      // Try static assets
      const staticResponse = await staticHandler(request);
      if (staticResponse) return staticResponse;

      // Try prerendered pages
      const prerenderedResponse = await prerenderedHandler(request);
      if (prerenderedResponse) return prerenderedResponse;

      // Fall back to SvelteKit (handle upgrades via event.platform)
      return await svelteKitHandler(request, bunServer);
    } catch (error) {
      console.error('Server error:', error);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: { 'content-type': 'text/plain' }
      });
    }
  }

  const server_instance = Bun.serve({
    ...listen,
    ...limits,
    fetch: handler,
    ...(websocket ? { websocket } : {}),
    error(error: Error) {
      console.error('Server error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  console.log(`Server running on ${server_instance.url}`);
  if (websocket) {
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