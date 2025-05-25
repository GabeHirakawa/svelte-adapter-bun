/**
 * Environment variable helper with prefix support
 */
export function env(name: string, defaultValue?: string | number): string | undefined {
  const prefixed = `${ENV_PREFIX}${name}`;
  const value = process.env[prefixed] ?? process.env[name];
  
  if (value !== undefined) {
    return value;
  }
  
  // If defaultValue is explicitly undefined, return undefined (don't throw)
  if (arguments.length > 1) {
    return defaultValue === undefined ? undefined : String(defaultValue);
  }
  
  throw new Error(`Environment variable ${prefixed} (or ${name}) is required`);
}

/**
 * Get environment variable as integer
 */
export function envInt(name: string, defaultValue?: number): number {
  const value = env(name, defaultValue);
  const parsed = parseInt(value as string, 10);
  
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid integer, got: ${value}`);
  }
  
  return parsed;
}

/**
 * Get environment variable as boolean
 */
export function envBool(name: string, defaultValue?: boolean): boolean {
  const value = env(name, defaultValue);
  
  if (typeof value === 'boolean') {
    return value;
  }
  
  const str = String(value).toLowerCase();
  return str === 'true' || str === '1' || str === 'yes' || str === 'on';
} 