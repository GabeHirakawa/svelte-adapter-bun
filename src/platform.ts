import { parse, serialize } from 'cookie';
import type { RequestOptions, CookieOptions } from './types.ts';
import { requestOrigin } from './origin.ts';

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
  protocol_header,
  host_header,
  port_header
}: RequestOptions): Promise<Request> {
  const url = new URL(request.url);
  const resolved = requestOrigin({
    origin,
    protocolHeader: protocol_header,
    hostHeader: host_header,
    portHeader: port_header,
    headers: request.headers,
  });
  if (resolved) {
    const originUrl = new URL(resolved);
    url.protocol = originUrl.protocol;
    url.host = originUrl.host;
  }
  
  const headers = new Headers(request.headers);

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
