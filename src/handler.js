import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';
import { prerendered } from 'MANIFEST';
import { env } from './env.js';
import { getRequest, setResponse } from './platform.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const server = new Server(manifest);
await server.init({ env: process.env });

const buildOptions = BUILD_OPTIONS;
const origin = env('ORIGIN', undefined);
const xff_depth = parseInt(env('XFF_DEPTH', '1'));
const address_header = env('ADDRESS_HEADER', '').toLowerCase();
const protocol_header = env('PROTOCOL_HEADER', '').toLowerCase();
const host_header = env('HOST_HEADER', 'host').toLowerCase();
const port_header = env('PORT_HEADER', '').toLowerCase();

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function handler(request) {
  try {
    const url = new URL(request.url);
    
    // Handle static assets - use Bun's native file serving for better performance
    if (url.pathname.startsWith('/_app/') || url.pathname === '/favicon.png' || url.pathname === '/robots.txt') {
      const assetPath = path.join(__dirname, 'client', url.pathname);
      console.log(`Asset request: ${url.pathname} -> ${assetPath}`);
      
      if (existsSync(assetPath)) {
        console.log(`Serving asset: ${assetPath}`);
        const file = Bun.file(assetPath);
        const content = await file.arrayBuffer();
        const mimeType = getMimeType(url.pathname) || file.type;
        
        const headers = {
          'cache-control': url.pathname.startsWith('/_app/immutable/') 
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=3600'
        };
        
        if (mimeType) {
          headers['content-type'] = mimeType;
        }
        
        return new Response(content, { headers });
      } else {
        console.log(`Asset not found: ${assetPath}`);
      }
    }
    
    // Handle prerendered pages
    if (prerendered.has(url.pathname)) {
      const prerenderedPath = path.join(__dirname, 'prerendered', url.pathname, url.pathname.endsWith('/') ? 'index.html' : '.html');
      
      if (existsSync(prerenderedPath)) {
        const content = await Bun.file(prerenderedPath).arrayBuffer();
        return new Response(content, {
          headers: {
            'content-type': 'text/html',
            'cache-control': 'public, max-age=3600'
          }
        });
      }
    }
    
    // Convert Bun Request to SvelteKit format
    const svelteRequest = await getRequest({
      request,
      origin,
      xff_depth,
      address_header,
      protocol_header,
      host_header,
      port_header
    });
    
    // Handle with SvelteKit
    const response = await server.respond(svelteRequest, {
      getClientAddress() {
        return svelteRequest.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
      },
      platform: {
        isBun() {
          return true;
        }
      }
    });
    
    return setResponse(response);
    
  } catch (error) {
    console.error('Handler error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request URL:', request.url);
    console.error('Request method:', request.method);
    return new Response(`Internal Server Error: ${error.message}`, { 
      status: 500,
      headers: { 'content-type': 'text/plain' }
    });
  }
}

/**
 * Get MIME type for file extension
 * @param {string} pathname
 * @returns {string | undefined}
 */
function getMimeType(pathname) {
  const ext = pathname.split('.').pop()?.toLowerCase();
  const mimeTypes = {
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
  
  return mimeTypes[ext];
} 