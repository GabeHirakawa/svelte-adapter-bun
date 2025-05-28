import { createServer } from './server.ts';

// Configuration passed from the adapter
const config = {
  manifestPath: './manifest.js',
  prerenderedPaths: [], // Will be populated by adapter
  xff_depth: 1, // Will be replaced by adapter
  websocket: {
    enabled: true
  }
  // wsHandler will be set at runtime if hooks.server.js exists
};

// Start the server
createServer(config); 