/**
 * Environment variable helper with prefix support
 * @param {string} name - Environment variable name
 * @param {string | number} defaultValue - Default value if not found
 * @returns {string}
 */
export function env(name, defaultValue) {
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
 * @param {string} name - Environment variable name  
 * @param {number} defaultValue - Default value if not found
 * @returns {number}
 */
export function envInt(name, defaultValue) {
  const value = env(name, defaultValue);
  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid integer, got: ${value}`);
  }
  
  return parsed;
}

/**
 * Get environment variable as boolean
 * @param {string} name - Environment variable name
 * @param {boolean} defaultValue - Default value if not found  
 * @returns {boolean}
 */
export function envBool(name, defaultValue) {
  const value = env(name, defaultValue);
  
  if (typeof value === 'boolean') {
    return value;
  }
  
  const str = String(value).toLowerCase();
  return str === 'true' || str === '1' || str === 'yes' || str === 'on';
} 