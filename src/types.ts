// Type definitions for the Bun SvelteKit adapter

export interface RequestOptions {
  request: Request;
  origin?: string;
  xff_depth: number;
  address_header?: string;
  protocol_header?: string;
  host_header?: string;
  port_header?: string;
}

export interface CookieOptions {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
}

export interface Platform {
  isBun(): boolean;
}

export interface RequestEvent {
  getClientAddress(): string;
  platform: Platform;
}

export interface MimeTypeMap {
  [key: string]: string;
}

export type Handler = (request: Request) => Promise<Response | null>;
export type SvelteKitHandler = (request: Request) => Promise<Response>;

export interface WebSocketConfig {
  enabled?: boolean;
  path?: string;
  compression?: boolean;
  maxCompressedSize?: number;
  maxBackpressure?: number;
}

/**
 * WebSocket handler that extends Bun's native WebSocketHandler for SvelteKit integration
 */
export interface WebSocketHandler extends Omit<Bun.WebSocketHandler<any>, 'upgrade'> {
  /**
   * Called to determine if a request should be upgraded to WebSocket
   * Return true to upgrade, false to skip
   */
  upgrade?(request: Request, upgrade: (request: Request) => boolean): boolean | Promise<boolean>;
}

// Declare global types for build-time replacements
declare global {
  const ENV_PREFIX: string;
  const BUILD_OPTIONS: any;
  const SERVER: any;
  const MANIFEST: any;
} 