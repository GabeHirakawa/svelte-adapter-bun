import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';
import { env } from './env.js';
import { getRequest, setResponse } from './platform.js';

// Initialize SvelteKit server
const server = new Server(manifest);
await server.init({ env: process.env });

// Configuration
const buildOptions = BUILD_OPTIONS;
const origin = env('ORIGIN', undefined);
const xff_depth = parseInt(env('XFF_DEPTH', '1'));
const address_header = env('ADDRESS_HEADER', '').toLowerCase();
const protocol_header = env('PROTOCOL_HEADER', '').toLowerCase();
const host_header = env('HOST_HEADER', 'host').toLowerCase();
const port_header = env('PORT_HEADER', '').toLowerCase();

/**
 * Create SvelteKit handler for dynamic routes
 * @returns {Function}
 */
export function createSvelteKitHandler() {
  return async function svelteKitHandler(request) {
    try {
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
      console.error('SvelteKit handler error:', error);
      console.error('Request URL:', request.url);
      console.error('Request method:', request.method);
      
      return new Response('Internal Server Error', { 
        status: 500,
        headers: { 'content-type': 'text/plain' }
      });
    }
  };
} 