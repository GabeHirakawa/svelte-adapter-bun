import { handler } from './handler.js';
import { env } from './env.js';

const server = Bun.serve({
  port: env('PORT', 3000),
  hostname: env('HOST', '0.0.0.0'),
  fetch: handler,
  
  // Bun-specific optimizations
  development: BUILD_OPTIONS.development,
  
  // WebSocket support
  websocket: {
    message(ws, message) {
      // Handle WebSocket messages if needed
    },
    open(ws) {
      // Handle WebSocket connections
    },
    close(ws, code, message) {
      // Handle WebSocket disconnections
    }
  },
  
  error(error) {
    console.error('Server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

console.log(`Server running on http://${server.hostname}:${server.port}`);

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  server.stop();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT')); 