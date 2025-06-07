import { logger } from './logger';

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  defaultValue?: string;
  format?: RegExp;
}

/**
 * Environment variables required for production
 */
const requiredEnvVars: EnvVar[] = [
  {
    name: 'NODE_ENV',
    required: true,
    description: 'Environment mode (development, production, test)',
    defaultValue: 'development',
  },
  {
    name: 'OXIGRAPH_ENDPOINT_URL',
    required: true,
    description: 'SPARQL endpoint URL for OxiGraph',
    defaultValue: 'http://localhost:7878',
  },
  {
    name: 'ORIGINTRAIL_NODE_HOSTNAME',
    required: true,
    description: 'Hostname for OriginTrail DKG node',
    defaultValue: 'http://localhost',
  },
  {
    name: 'ORIGINTRAIL_NODE_PORT',
    required: true,
    description: 'Port for OriginTrail DKG node',
    defaultValue: '7878',
  },
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'Secret key for JWT token generation',
    format: /^.{32,}$/,
  },
  {
    name: 'SOLANA_RPC_URL',
    required: false,
    description: 'Solana RPC URL for blockchain integration',
  },
  {
    name: 'DATABASE_URL',
    required: false,
    description: 'Database connection URL',
  },
  {
    name: 'LOG_LEVEL',
    required: false,
    description: 'Logging level (debug, info, warn, error)',
    defaultValue: 'info',
  },
];

/**
 * Validates that all required environment variables are set
 * @returns {boolean} true if all required variables are set, false otherwise
 */
export function validateEnv(): boolean {
  logger.info('Validating environment variables...');
  
  let isValid = true;
  const missingVars: string[] = [];
  const invalidFormatVars: string[] = [];

  // Check each required environment variable
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar.name] || envVar.defaultValue;

    // Check if the variable is required and missing
    if (envVar.required && !value) {
      isValid = false;
      missingVars.push(envVar.name);
      logger.error(`Missing required environment variable: ${envVar.name} (${envVar.description})`);
    }

    // Check if the variable format is valid
    if (value && envVar.format && !envVar.format.test(value)) {
      isValid = false;
      invalidFormatVars.push(envVar.name);
      logger.error(`Invalid format for environment variable: ${envVar.name} (${envVar.description})`);
    }
  }

  // Log a summary of missing and invalid variables
  if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  if (invalidFormatVars.length > 0) {
    logger.error(`Invalid format for environment variables: ${invalidFormatVars.join(', ')}`);
  }

  if (isValid) {
    logger.info('Environment validation successful.');
  } else {
    logger.warn('Environment validation failed. Application may not function correctly.');
  }

  return isValid;
}

/**
 * Sets default values for optional environment variables
 */
export function setDefaultEnvValues(): void {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar.name] && envVar.defaultValue) {
      process.env[envVar.name] = envVar.defaultValue;
      logger.debug(`Using default value for ${envVar.name}: ${envVar.defaultValue}`);
    }
  }
}

// Export function to get environment variables with default values
export function getEnv(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue;
}

// Check for development vs production mode
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
} 