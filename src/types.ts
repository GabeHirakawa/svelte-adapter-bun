// Type definitions for the Bun SvelteKit adapter

export interface RequestOptions {
  request: Request;
  origin?: string;
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
  server: Bun.Server;
  request: Request;
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

export type WebSocketHandler = Bun.WebSocketHandler;

// Declare global types for build-time replacements
declare global {
  const ENV_PREFIX: string;
  const BUILD_OPTIONS: { assets?: boolean };
  const SERVER: any;
  const MANIFEST: any;
} 