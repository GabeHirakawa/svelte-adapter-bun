import { parse, serialize } from 'cookie';
import type { RequestOptions, CookieOptions } from './types.js';

/**
 * Convert Bun Request to SvelteKit Request
 */
export async function getRequest({
  request,
  origin,
  xff_depth,
  address_header,
  protocol_header,
  host_header,
  port_header
}: RequestOptions): Promise<Request> {
  const url = new URL(request.url);
  
  // Handle origin and protocol/host headers
  if (origin) {
    const originUrl = new URL(origin);
    url.protocol = originUrl.protocol;
    url.host = originUrl.host;
  } else {
    // Use headers to determine origin
    if (protocol_header && request.headers.get(protocol_header)) {
      url.protocol = request.headers.get(protocol_header) + ':';
    }
    
    if (host_header && request.headers.get(host_header)) {
      url.host = request.headers.get(host_header) as string;
    }
    
    if (port_header && request.headers.get(port_header)) {
      const port = request.headers.get(port_header);
      url.port = port as string;
    }
  }
  
  // Handle client IP address
  const headers = new Headers(request.headers);
  
  if (address_header) {
    const address = request.headers.get(address_header);
    if (address) {
      if (address_header === 'x-forwarded-for') {
        // Handle X-Forwarded-For with depth
        const addresses = address.split(',').map(addr => addr.trim());
        const clientAddress = addresses[Math.max(0, addresses.length - xff_depth)] || addresses[0] || '';
        headers.set('x-forwarded-for', clientAddress);
      } else {
        headers.set('x-forwarded-for', address);
      }
    }
  }
  
  // Create new request with corrected URL
  return new Request(url.toString(), {
    method: request.method,
    headers,
    body: request.body,
    duplex: 'half'
  } as RequestInit);
}

/**
 * Convert SvelteKit Response to Bun Response
 */
export function setResponse(response: Response): Response {
  // Bun's Response is already compatible with Web API Response
  // Just ensure headers are properly set
  const headers = new Headers(response.headers);
  
  // Handle Set-Cookie headers properly
  const setCookieHeaders = (response.headers as any).getSetCookie?.() || [];
  if (setCookieHeaders.length > 0) {
    // Remove existing set-cookie header
    headers.delete('set-cookie');
    // Add each set-cookie header individually
    setCookieHeaders.forEach((cookie: string) => {
      headers.append('set-cookie', cookie);
    });
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Parse cookies from request
 */
export function getCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get('cookie');
  return cookieHeader ? parse(cookieHeader) : {};
}

/**
 * Set cookie in response
 */
export function setCookie(
  response: Response, 
  name: string, 
  value: string, 
  options: CookieOptions = {}
): Response {
  const headers = new Headers(response.headers);
  const cookieString = serialize(name, value, options);
  headers.append('set-cookie', cookieString);
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
} 