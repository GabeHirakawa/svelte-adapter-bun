/// <reference path="./ambient.d.ts" />

import type { Adapter } from "@sveltejs/kit";

export interface CompressOptions {
  files?: string[];
  brotli?: boolean;
  gzip?: boolean;
}

export interface AdapterOptions {
  out?: string;
  precompress?: boolean | CompressOptions;
  envPrefix?: string;
  xff_depth?: number;
  assets?: boolean;
}

export type Platform = {
  server: Bun.Server;
  request: Request;
};

export default function (opts?: AdapterOptions): Adapter;
