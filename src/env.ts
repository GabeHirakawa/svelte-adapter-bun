/**
 * Environment variable helper with prefix support
 */
export function env(name: string): string | undefined;
export function env(name: string, defaultValue: string | number): string;
export function env(name: string, defaultValue?: string | number): string | undefined {
  const value = process.env[name];
  
  if (value !== undefined) {
    return value;
  }
  
  // If defaultValue is provided, return it as string
  if (arguments.length > 1) {
    return defaultValue === undefined ? undefined : String(defaultValue);
  }
  
  // Return undefined if no default provided (don't throw)
  return undefined;
}

/**
 * Get environment variable as integer
 */
export function envInt(name: string, defaultValue?: number): number {
  const value = defaultValue !== undefined 
    ? env(name, defaultValue.toString())
    : env(name);

  if (value === undefined) {
    throw new Error(`Environment variable ${name} is required for integer parsing`);
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid integer, got: ${value}`);
  }

  return parsed;
}

/**
 * Get environment variable as boolean
 */
export function envBool(name: string, defaultValue?: boolean): boolean {
  const value = defaultValue !== undefined 
    ? env(name, defaultValue.toString())
    : env(name);
  
  if (value === undefined) {
    return false;
  }
  
  const str = String(value).toLowerCase();
  return str === 'true' || str === '1' || str === 'yes' || str === 'on';
} 