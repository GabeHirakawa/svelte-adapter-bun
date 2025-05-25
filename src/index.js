import { env } from './env.js';
import { createStaticHandler } from './static.js';
import { createPrerenderedHandler } from './prerendered.js';
import { createSvelteKitHandler } from './sveltekit.js';

const port = parseInt(env('PORT', '3000'));
const host = env('HOST', '0.0.0.0');

// Create handlers in order of priority
const staticHandler = createStaticHandler();
const prerenderedHandler = createPrerenderedHandler();
const svelteKitHandler = createSvelteKitHandler();

/**
 * Main request handler with proper middleware chain
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handler(request) {
  try {
    // 1. Try static assets first (highest priority)
    const staticResponse = await staticHandler(request);
    if (staticResponse) {
      return staticResponse;
    }

    // 2. Try prerendered pages second
    const prerenderedResponse = await prerenderedHandler(request);
    if (prerenderedResponse) {
      return prerenderedResponse;
    }

    // 3. Fall back to SvelteKit for dynamic routes
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
const server = Bun.serve({
  port,
  hostname: host,
  fetch: handler,
  error(error) {
    console.error('Server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

console.log(`Server running on http://${host}:${port}`);

export { handler };

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  server.stop();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT')); 