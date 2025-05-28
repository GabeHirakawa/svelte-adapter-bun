import { parse, serialize } from 'cookie';
import type { RequestOptions, CookieOptions } from './types.ts';

/**
 * Feature detection for duplex property support in Request constructor
 */
function supportsDuplexProperty(): boolean {
  try {
    new Request('http://localhost', {
      method: 'POST',
      body: 'test',
      duplex: 'half'
    } as any);
    return true;
  } catch (error) {
    return false;
  }
}

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
  
  if (origin) {
    const originUrl = new URL(origin);
    url.protocol = originUrl.protocol;
    url.host = originUrl.host;
  } else {
    if (protocol_header && request.headers.get(protocol_header)) {
      const protocol = request.headers.get(protocol_header);
      if (protocol && /^https?$/.test(protocol)) {
        url.protocol = protocol + ':';
      }
    }
    
    if (host_header && request.headers.get(host_header)) {
      const host = request.headers.get(host_header);
      if (host && isValidHost(host)) {
         url.host = host;
       }
    }
    
    if (port_header && request.headers.get(port_header)) {
      const port = request.headers.get(port_header);
      if (port && /^\d+$/.test(port)) {
        const portNum = parseInt(port, 10);
        if (portNum >= 1 && portNum <= 65535) {
          url.port = port;
        }
      }
    }
  }
  
  const headers = new Headers(request.headers);
  
  if (address_header) {
    const address = request.headers.get(address_header);
    if (address) {
      if (address_header === 'x-forwarded-for') {
        const addresses = address.split(',').map(addr => addr.trim());
        const clientAddress = addresses[Math.max(0, addresses.length - xff_depth)] || addresses[0] || '';
        headers.set('x-forwarded-for', clientAddress);
      } else {
        headers.set('x-forwarded-for', address);
      }
    }
  }
  
  const requestInit: RequestInit = {
    method: request.method,
    headers,
    body: request.body,
  };

  if (supportsDuplexProperty()) {
    (requestInit as any).duplex = 'half';
  }

  return new Request(url.toString(), requestInit);
}

/**
 * Convert SvelteKit Response to Bun Response
 */
export function setResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  
  const setCookieHeaders = 'getSetCookie' in response.headers && 
    typeof response.headers.getSetCookie === 'function' 
    ? response.headers.getSetCookie() 
    : [];
  if (setCookieHeaders.length > 0) {
    headers.delete('set-cookie');
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

function isValidHost(host: string): boolean {
  // Remove port if present
  const [hostname, port] = host.split(':');
  
  // Validate hostname (basic DNS name validation)
  if (!hostname || !/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(hostname)) {
    return false;
  }
  
  // Validate port if present
  if (port && (!/^\d+$/.test(port) || parseInt(port, 10) < 1 || parseInt(port, 10) > 65535)) {
    return false;
  }
  
  return true;
} 