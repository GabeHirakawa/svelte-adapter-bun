import { prerendered } from 'MANIFEST';
import { fileURLToPath } from 'url';
import path from 'path';
import { existsSync } from 'fs';
import type { Handler } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Create prerendered page handler
 */
export function createPrerenderedHandler(): Handler {
  return async function prerenderedHandler(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    
    // Only handle prerendered routes
    if (!prerendered.has(url.pathname)) {
      return null; // Not a prerendered route
    }
    
    let prerenderedPath: string;
    
    if (url.pathname === '/') {
      prerenderedPath = path.join(__dirname, 'prerendered', 'index.html');
    } else if (url.pathname.endsWith('/')) {
      // For paths ending with /, try both directory/index.html and path.html
      const dirPath = path.join(__dirname, 'prerendered', url.pathname, 'index.html');
      const filePath = path.join(__dirname, 'prerendered', url.pathname.slice(0, -1) + '.html');
      prerenderedPath = existsSync(dirPath) ? dirPath : filePath;
    } else {
      // For paths without trailing slash, try both path.html and path/index.html
      const filePath = path.join(__dirname, 'prerendered', url.pathname + '.html');
      const dirPath = path.join(__dirname, 'prerendered', url.pathname, 'index.html');
      prerenderedPath = existsSync(filePath) ? filePath : dirPath;
    }
    
    if (!existsSync(prerenderedPath)) {
      console.warn(`Prerendered file not found: ${prerenderedPath} for route ${url.pathname}`);
      return null; // Let SvelteKit handle it
    }
    
    try {
      const file = Bun.file(prerenderedPath);
      const content = await file.arrayBuffer();
      
      return new Response(content, {
        headers: {
          'content-type': 'text/html',
          'cache-control': 'public, max-age=3600'
        }
      });
      
    } catch (error) {
      console.error('Error serving prerendered page:', prerenderedPath, error);
      return null; // Let SvelteKit handle it
    }
  };
} 