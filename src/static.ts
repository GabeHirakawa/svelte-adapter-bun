import { fileURLToPath } from 'url';
import path from 'path';
import { existsSync } from 'fs';
import type { Handler, MimeTypeMap } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Get MIME type for file extension
 */
function getMimeType(pathname: string): string | undefined {
  const ext = pathname.split('.').pop()?.toLowerCase();
  const mimeTypes: MimeTypeMap = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'mjs': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject',
    'webp': 'image/webp',
    'avif': 'image/avif'
  };
  
  return ext ? mimeTypes[ext] : undefined;
}

/**
 * Create static file handler
 */
export function createStaticHandler(): Handler {
  return async function staticHandler(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    
    // Only handle static asset paths
    if (!url.pathname.startsWith('/_app/') && 
        url.pathname !== '/favicon.png' && 
        url.pathname !== '/robots.txt') {
      return null; // Not a static asset
    }
    
    // Sanitize pathname to prevent path traversal
    const safePath = path.posix.normalize(url.pathname).replace(/^\/+/, '');
    const assetPath = path.join(__dirname, 'client', safePath);
    
    if (!existsSync(assetPath)) {
      // Return 404 for missing static assets instead of falling through
      return new Response('Not Found', { 
        status: 404, 
        headers: { 'content-type': 'text/plain' } 
      });
    }
    
    try {
      const file = Bun.file(assetPath);
      const content = await file.arrayBuffer();
      const mimeType = getMimeType(url.pathname) || file.type;
      
      const headers: Record<string, string> = {
        'cache-control': url.pathname.startsWith('/_app/immutable/') 
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=3600'
      };
      
      if (mimeType) {
        headers['content-type'] = mimeType;
      }
      
      return new Response(content, { headers });
      
    } catch (error) {
      console.error('Error serving static asset:', assetPath, error);
      return new Response('Internal Server Error', { 
        status: 500, 
        headers: { 'content-type': 'text/plain' } 
      });
    }
  };
} 