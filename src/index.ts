import { createServer } from './server.ts';

// Configuration passed from the adapter
const config = {
  manifestPath: './manifest.js',
  prerenderedPaths: [], // Will be populated by adapter
  xff_depth: 1 // Will be replaced by adapter
};

// Start the server
createServer(config); 