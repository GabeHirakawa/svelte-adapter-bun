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
 * WebSocket handler following SvelteKit hooks pattern
 */
export interface WebSocketHandler {
  /**
   * Called when a WebSocket connection is opened
   */
  open?(ws: any): void | Promise<void>;
  
  /**
   * Called when a WebSocket message is received
   */
  message?(ws: any, message: string | Buffer): void | Promise<void>;
  
  /**
   * Called when a WebSocket connection is closed
   */
  close?(ws: any, code?: number, reason?: string): void | Promise<void>;
  
  /**
   * Called when WebSocket backpressure is relieved
   */
  drain?(ws: any): void | Promise<void>;
  
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