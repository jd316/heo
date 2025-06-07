// src/elizaos/heo-plugin.ts
import { type Plugin } from '@elizaos/core';
import { type ElizaOSContext, type ElizaOSService } from './types';
import { logger as globalLogger } from '../utils/logger'; // Use a more specific name for the global logger
import process from 'process';

// Import actual service implementations
import { hypothesisService } from '@/services/hypothesisService';
import { protocolService } from '@/services/protocolService';
import { dkgService } from '@/services/dkgService';
import { oxigraphCacheService } from '@/services/oxigraphCacheService';
import { ipfsService } from '@/services/ipfsService';
import { solanaService } from '@/services/solanaService';
import { labAutomationService } from '@/services/labAutomationService';
import { zkSnarkService } from '@/services/zkSnarkService';
import { fairService } from '@/services/fairService';

const HEO_PLUGIN_VERSION = '0.1.0'; // From PRD reference

// Wrapper function to adapt existing services to ElizaOSService interface
function adaptService(
  serviceName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceObject: any, 
  methods: Array<{ methodName: string; serviceType: string; description?: string }>
): ElizaOSService<unknown, unknown>[] {
  const adaptedServices: ElizaOSService<unknown, unknown>[] = [];
  for (const methodInfo of methods) {
    if (typeof serviceObject[methodInfo.methodName] === 'function') {
      adaptedServices.push({
        id: `${serviceName}-${methodInfo.methodName}`,
        type: methodInfo.serviceType,
        description: methodInfo.description || `Endpoint for ${serviceName}'s ${methodInfo.methodName} method.`,
        execute: async (input: unknown, context?: ElizaOSContext) => {
          // Use context.logger if available, otherwise service's own logger (which is now context-aware after init)
          const effectiveLogger = context?.logger || serviceObject.logger || globalLogger;
          effectiveLogger.debug(`Executing ${serviceName}.${methodInfo.methodName} via ElizaOS adapter`, { input, contextProvided: !!context });
          try {
            // Pass context to the service method, as they are now context-aware
            const result = await serviceObject[methodInfo.methodName](input, context);
            return result;
          } catch (error) {
            effectiveLogger.error(`Error executing ${serviceName}.${methodInfo.methodName} via ElizaOS adapter`, { error });
            throw error; 
          }
        },
      });
    } else {
      globalLogger.warn(`Method ${methodInfo.methodName} not found on service ${serviceName} for ElizaOS adaptation.`);
    }
  }
  return adaptedServices;
}


export const heoPlugin: Plugin = {
  name: 'Hypothesis-to-Experiment-Orchestrator',
  version: HEO_PLUGIN_VERSION,
  description: 'ElizaOS plugin to automate AI-driven scientific research workflows, integrating decentralized knowledge graphs, Solana blockchain, and zero-knowledge proofs.',

  async initialize(context: ElizaOSContext): Promise<boolean> {
    context.logger.info('HEO Plugin: Initializing...', { version: HEO_PLUGIN_VERSION, contextConfig: context.config });

    // Initialize all imported services with the provided context
    hypothesisService.initialize(context);
    protocolService.initialize(context); // Assuming protocolService has an initialize method
    dkgService.initialize(context);
    oxigraphCacheService.initialize(context);
    ipfsService.initialize(context);
    solanaService.initialize(context);
    labAutomationService.initialize(context);
    zkSnarkService.initialize(context);
    
    context.logger.info('HEO Plugin: All services initialized.');
    return true;
  },

  async destroy(): Promise<void> {
    globalLogger.info('HEO Plugin: Destroying...'); // Use globalLogger or context.logger if destroy had context
    // Add cleanup logic for services if necessary
    // e.g., await ipfsService.shutdown(context); // if shutdown needed context
    await ipfsService.shutdown(); // Assuming shutdown does not need context or uses its own initialized logger
    await solanaService.shutdown(); // Assuming shutdown does not need context
    // Other services like dkg, oxigraph don't have explicit shutdown in their current refactored state
    globalLogger.info('HEO Plugin: Destruction complete.');
  },

  services: [
    // Adapt hypothesisService methods
    ...adaptService('hypothesisService', hypothesisService, [
      { methodName: 'generateAndScoreHypotheses', serviceType: 'HYPOTHESIS_GENERATION', description: 'Generates and scores scientific hypotheses based on input query and RAG.' },
    ]),
    // Adapt protocolService methods
    ...adaptService('protocolService', protocolService, [
      // Assuming listAvailableTemplates, getTemplateDetails, prepareProtocolForExecution, etc., are methods on protocolService instance
      // and they are now context-aware after protocolService.initialize(context)
      { methodName: 'getProtocolTemplates', serviceType: 'PROTOCOL_TEMPLATE_LISTING', description: 'Lists available experiment protocol templates.' },
      { methodName: 'getTemplateDetails', serviceType: 'PROTOCOL_TEMPLATE_DETAIL', description: 'Gets details for a specific protocol template.' },
      { methodName: 'initializeProtocolInstance', serviceType: 'PROTOCOL_PREPARATION', description: 'Prepares a protocol instance for execution, including parameter validation.' },
    ]),
    // Adapt dkgService methods
    ...adaptService('dkgService', dkgService, [
      { methodName: 'query', serviceType: 'DKG_SPARQL_QUERY', description: 'Runs a SPARQL query against the DKG.' },
      { methodName: 'createAsset', serviceType: 'DKG_PUBLISH', description: 'Publishes a knowledge asset to the DKG.' },
      { methodName: 'getAsset', serviceType: 'DKG_RETRIEVE', description: 'Retrieves a knowledge asset by UAL.' },
    ]),
    // Adapt oxigraphCacheService methods
    ...adaptService('oxigraphCacheService', oxigraphCacheService, [
      { methodName: 'executeQuery', serviceType: 'OXIGRAPH_SPARQL_QUERY', description: 'Executes a SPARQL SELECT query against the OxiGraph cache.' },
      { methodName: 'executeUpdate', serviceType: 'OXIGRAPH_SPARQL_UPDATE', description: 'Executes a SPARQL UPDATE query against the OxiGraph cache.' },
    ]),
    // Adapt ipfsService methods
    ...adaptService('ipfsService', ipfsService, [
      { methodName: 'store', serviceType: 'IPFS_STORE_DATA', description: 'Stores data (e.g., JSON-LD) on IPFS.' },
      { methodName: 'retrieve', serviceType: 'IPFS_RETRIEVE_DATA', description: 'Retrieves data from IPFS using a CID.' },
    ]),
    // Adapt fairService methods
    ...adaptService('fairService', fairService, [
      { methodName: 'toJsonLd', serviceType: 'FAIR_JSONLD_TRANSFORM', description: 'Transforms experiment data into FAIR-compliant JSON-LD.' },
      { methodName: 'storeFairPackage', serviceType: 'FAIR_STORE_PACKAGE', description: 'Stores FAIR JSON-LD package on IPFS and returns CID.' },
    ]),
    // Adapt labAutomationService methods
    ...adaptService('labAutomationService', labAutomationService, [
      { methodName: 'submitRun', serviceType: 'EXECUTE_EXPERIMENT_ON_LAB', description: 'Submits protocol for cloud-lab execution.' },
      { methodName: 'pollRunStatus', serviceType: 'LAB_RUN_STATUS', description: 'Polls cloud-lab run status.' },
      { methodName: 'fetchResults', serviceType: 'LAB_FETCH_RESULTS', description: 'Fetches raw experimental results.' },
    ]),
    // Adapt zkSnarkService methods
    ...adaptService('zkSnarkService', zkSnarkService, [
      { methodName: 'generateProof', serviceType: 'PROVE_EXPERIMENT', description: 'Generates zkSNARK proof for experiment.' },
      { methodName: 'generateAndAnchorProof', serviceType: 'GENERATE_AND_ANCHOR_EXPERIMENT_PROOF', description: 'Generates proof and anchors it on Solana.' },
    ]),
    // Adapt solanaService methods
    ...adaptService('solanaService', solanaService, [
      { methodName: 'anchorProof', serviceType: 'ANCHOR_EXPERIMENT_PROOF', description: 'Anchors experiment proof on Solana.' },
    ]),
  ],
  dkgEndpoints: { 
    query: '/api/dkg/query', 
    publish: '/api/dkg/publish',
  },
  solanaConfig: { 
    cluster: process.env.SOLANA_CLUSTER || 'devnet', 
  },
};

export default heoPlugin; 