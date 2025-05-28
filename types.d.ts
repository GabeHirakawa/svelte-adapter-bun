declare module 'tiny-glob' {
  interface GlobOptions {
    cwd?: string;
    dot?: boolean;
    absolute?: boolean;
    filesOnly?: boolean;
  }
  
  function glob(pattern: string, options?: GlobOptions): Promise<string[]>;
  export = glob;
} 