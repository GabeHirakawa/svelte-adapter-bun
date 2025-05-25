import { parse, serialize } from 'cookie';

/**
 * Convert Bun Request to SvelteKit Request
 * @param {Object} options
 * @param {Request} options.request - Bun request object
 * @param {string} options.origin - Origin URL
 * @param {number} options.xff_depth - X-Forwarded-For depth
 * @param {string} options.address_header - Address header name
 * @param {string} options.protocol_header - Protocol header name  
 * @param {string} options.host_header - Host header name
 * @param {string} options.port_header - Port header name
 * @returns {Promise<Request>}
 */
export async function getRequest({
  request,
  origin,
  xff_depth,
  address_header,
  protocol_header,
  host_header,
  port_header
}) {
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
      url.host = request.headers.get(host_header);
    }
    
    if (port_header && request.headers.get(port_header)) {
      const port = request.headers.get(port_header);
      url.port = port;
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
        const clientAddress = addresses[Math.max(0, addresses.length - xff_depth)];
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
  });
}

/**
 * Convert SvelteKit Response to Bun Response
 * @param {Response} response - SvelteKit response
 * @returns {Response}
 */
export function setResponse(response) {
  // Bun's Response is already compatible with Web API Response
  // Just ensure headers are properly set
  const headers = new Headers(response.headers);
  
  // Handle Set-Cookie headers properly
  const setCookieHeaders = response.headers.getSetCookie?.() || [];
  if (setCookieHeaders.length > 0) {
    // Remove existing set-cookie header
    headers.delete('set-cookie');
    // Add each set-cookie header individually
    setCookieHeaders.forEach(cookie => {
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
 * @param {Request} request
 * @returns {Record<string, string>}
 */
export function getCookies(request) {
  const cookieHeader = request.headers.get('cookie');
  return cookieHeader ? parse(cookieHeader) : {};
}

/**
 * Set cookie in response
 * @param {Response} response
 * @param {string} name
 * @param {string} value
 * @param {Object} options
 * @returns {Response}
 */
export function setCookie(response, name, value, options = {}) {
  const headers = new Headers(response.headers);
  const cookieString = serialize(name, value, options);
  headers.append('set-cookie', cookieString);
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
} 