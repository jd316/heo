// Hypothetical ElizaOS Plugin & Context Types
// Based on PRD, Custom Instructions, and common plugin patterns.

/**
 * Common ElizaOS types used throughout the HEO plugin
 */

/**
 * ElizaOS context object passed to plugin functions
 */
export interface ElizaOSContext {
  /**
   * Logger interface for plugin logging
   */
  logger: {
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
    debug: (message: string, ...args: unknown[]) => void;
  };
  
  /**
   * Plugin configuration values
   */
  config?: Record<string, unknown>;
  
  /**
   * Runtime methods for interacting with the ElizaOS agent runtime
   */
  runtime?: unknown;
}

/**
 * ElizaOS Service interface
 */
export interface IService {
  capabilityDescription: string;
  stop(): Promise<void>;
}

/**
 * ElizaOS Runtime interface
 */
export interface IAgentRuntime {
  logger: ElizaOSContext['logger'];
  getSetting: (key: string) => unknown;
  registerService: (service: IService) => Promise<void>;
}

/**
 * ElizaOS Service constructor interface
 */
export interface ServiceConstructor {
  serviceType: string;
  start(runtime: IAgentRuntime): Promise<IService>;
  new(): IService;
}

/**
 * ElizaOS Message interface
 */
export interface Message {
  id: string;
  text: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Defines a service that the plugin can expose to ElizaOS or other plugins.
 */
export interface ElizaOSService<TInput = unknown, TOutput = unknown> {
  type: string; // e.g., 'TEXT_GENERATION', 'IMAGE_DESCRIPTION', 'PROTOCOL_EXECUTION'
  id: string; // Unique identifier for this service instance
  description?: string;
  execute: (input: TInput, context?: ElizaOSContext) => Promise<TOutput>;
  // May include schema for input/output validation
}

/**
 * Main interface for an ElizaOS Plugin.
 * This structure is based on the requirements in PRD and BIO_AI project specifics.
 */
export interface ElizaOSPlugin {
  name: string;
  version: string;
  description: string;

  /**
   * Called when ElizaOS loads the plugin.
   * @param context Provides configuration and access to ElizaOS core functionalities.
   */
  initialize: (context: ElizaOSContext) => Promise<boolean>;

  /**
   * Called when ElizaOS unloads the plugin.
   */
  destroy: () => Promise<void>;

  /**
   * List of services this plugin provides.
   */
  services: ElizaOSService<unknown, unknown>[];

  /**
   * DKG endpoint exposure as per BIO_AI plugin requirements.
   */
  dkgEndpoints?: {
    query: string; // Relative path for query endpoint
    publish: string; // Relative path for publish endpoint
  };

  /**
   * Solana integration specifics as per BIO_AI plugin requirements.
   */
  solanaConfig?: {
    // Program IDs, required accounts, SPL token interactions details
    [key: string]: unknown;
  };

  // Other lifecycle methods or properties as required by ElizaOS SDK v2.4+
  // e.g., onConfigurationChanged, healthCheck, etc.
}
