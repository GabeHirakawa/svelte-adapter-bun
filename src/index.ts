import { createServer } from './server.ts';

const config = {
  manifestPath: './manifest.js',
  prerenderedPaths: [],
};

createServer(config);
