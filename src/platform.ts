import type { RequestOptions } from './types.ts';
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
    url.hostname = originUrl.hostname;
    url.port = originUrl.port;
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
