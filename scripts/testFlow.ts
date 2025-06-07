// Load environment variables
import * as dotenv from 'dotenv';
// DKG SDK for publishing on the Decentralized Knowledge Graph
import DKG from 'dkg.js';
import { BLOCKCHAIN_IDS } from 'dkg.js/constants';
// DID prefix for constructing UAL
const DID_PREFIX = 'did:dkg';
// Import services via CommonJS for ts-node
import { hypothesisService } from '../src/services/hypothesisService.ts';
import { labAutomationService } from '../src/services/labAutomationService.ts';
import { zkSnarkService } from '../src/services/zkSnarkService.ts';
import { ipfsService } from '../src/services/ipfsService.ts';
import { solanaService } from '../src/services/solanaService.ts';
import type { ElizaOSContext } from '../src/elizaos/types.ts';
import type { ExperimentalData } from '../src/services/zkSnarkService.ts';

// Add this near the top, after imports
interface DkgExtendedConfig {
  environment: string;
  endpoint: string;
  port: number;
  blockchain: {
    name: string;
    publicKey: string;
    privateKey: string;
  };
  maxNumberOfRetries: number;
  frequency: number;
  contentType: 'all';
  nodeApiVersion: string;
}

async function main() {
  dotenv.config();
  const context: ElizaOSContext = { config: process.env as Record<string, unknown>, logger: console };

  // Initialize services with real environment variables and connections
  hypothesisService.initialize(context);
  labAutomationService.initialize(context);
  zkSnarkService.initialize(context);
  ipfsService.initialize(context);
  await solanaService.initialize(context);

  const userQuery = 'Test hypothesis generation';
  console.log('1. Generating hypotheses...');
  const hypotheses = await hypothesisService.generateAndScoreHypotheses(
    { query: userQuery },
    context
  );
  if (!hypotheses.length) throw new Error('No hypotheses generated');
  const hypothesis = hypotheses[0];
  console.log('Hypothesis:', hypothesis.text);

  console.log('2. Submitting lab protocol...');
  const protocolPayload = {
    templateId: 'pcr_protocol',
    steps: ['Step 1', 'Step 2', 'Step 3'],
  };
  const runId = await labAutomationService.submitRun(protocolPayload);
  console.log('Run ID:', runId);
  const status = await labAutomationService.pollRunStatus(runId);
  console.log('Run status:', status);
  const resultsUnknown = await labAutomationService.fetchResults(runId);
  const results = resultsUnknown as ExperimentalData;
  console.log('Experimental results received');

  console.log('3. Generating and anchoring zkSNARK proof...');
  const { proofResult, transactionId } = await zkSnarkService.generateAndAnchorProof({
    protocolInstanceId: runId,
    rawData: results,
  });
  console.log('Proof IPFS CID:', proofResult.ipfsCid);
  console.log('Solana transaction signature:', transactionId);

  console.log('4. Storing full metadata on IPFS...');
  const metadata = {
    hypothesis: hypothesis.text,
    runId,
    proofCid: proofResult.ipfsCid,
    solanaTx: transactionId,
    timestamp: new Date().toISOString(),
  };
  const metadataCid = await ipfsService.store(JSON.stringify(metadata));
  console.log('Metadata IPFS CID:', metadataCid);

  console.log('5. Publishing metadata as a Knowledge Asset on DKG...');
  // Optionally skip real DKG for mocking
  const SKIP_DKG = process.env.SKIP_DKG === 'true';
  let UAL: string;
  if (SKIP_DKG) {
    console.log('SKIP_DKG enabled: mocking DKG publish & retrieval.');
    UAL = 'mock-ual';
    console.log('Published Knowledge Asset UAL (mock):', UAL);
  } else {
    // Instantiate DKG client and publish metadata, with fallback in development
    try {
      console.log('DKG endpoint read from env:', process.env.OT_NODE_HOSTNAME, 'port:', process.env.OT_NODE_PORT);
      const dkgConfig: DkgExtendedConfig = {
      environment: process.env.ENVIRONMENT || 'testnet',
      endpoint: process.env.OT_NODE_HOSTNAME!,
      port: Number(process.env.OT_NODE_PORT || '8900'),
      blockchain: {
        name: BLOCKCHAIN_IDS.NEUROWEB_TESTNET,
        publicKey: process.env.PUBLIC_KEY!,
        privateKey: process.env.PRIVATE_KEY!,
      },
        maxNumberOfRetries: Number(process.env.DKG_MAX_RETRIES || '300'),
        frequency: Number(process.env.DKG_FREQUENCY || '2'),
        contentType: 'all',
        nodeApiVersion: process.env.DKG_API_VERSION || '/v1',
      };
      const dkgClient = new DKG(dkgConfig);
      // Verify node connectivity
      try {
        const info = await dkgClient.node.info();
        console.log('Connected DKG node info:', info);
      } catch (infoErr) {
        console.warn('DKG node.info() failed:', infoErr);
      }
      // --- START: Ensure DKG token allowance is sufficient ---
      try {
        // Typed assertion for DKG allowance methods
        const assetAllowance = dkgClient.asset as unknown as {
          getCurrentAllowance(): Promise<string>;
          increaseAllowance(amount: string): Promise<void>;
        };
        const currentAllowance = await assetAllowance.getCurrentAllowance();
        const threshold = BigInt(process.env.DKG_ALLOWANCE_THRESHOLD || '1000000000000000000'); // default 1 TRAC
        if (BigInt(currentAllowance) < threshold) {
          console.log('Allowance below threshold, increasing allowance to', threshold.toString());
          await assetAllowance.increaseAllowance(threshold.toString());
          const newAllowance = await assetAllowance.getCurrentAllowance();
          console.log('Updated DKG allowance:', newAllowance);
        }
      } catch (allowErr) {
        console.warn('Failed to verify/increase DKG allowance:', allowErr);
      }
      // --- END: Allowance check ---
    // Build JSON-LD content for the Knowledge Asset
    const content = {
      public: {
        '@context': 'https://schema.org',
        '@id': `urn:exp:${runId}`,
        '@type': 'ExperimentResult',
        metadataCid,
        hypothesis: hypothesis.text,
        proofCid: proofResult.ipfsCid,
        solanaTx: transactionId,
        timestamp: metadata.timestamp,
      },
    };
      // Create the asset and log raw result
      const createResult = await dkgClient.asset.create(content, {
        epochsNum: 2,
        minimumNumberOfFinalizationConfirmations: 1,
        minimumNumberOfNodeReplications: 1,
      }) as { datasetRoot: string };
      console.log('Raw DKG create result:', JSON.stringify(createResult, null, 2));
      // Construct UAL from datasetRoot
      const datasetRoot = createResult.datasetRoot as string;
      if (!datasetRoot) {
        throw new Error('Missing datasetRoot in DKG create result');
      }
      UAL = `${DID_PREFIX}:${BLOCKCHAIN_IDS.NEUROWEB_TESTNET}/${datasetRoot}/0`;
    console.log('Published Knowledge Asset UAL:', UAL);

      // 6a. Wait for asset finalization to ensure it's available on the network
      console.log('6a. Waiting for asset finalization...');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalityResult = await (dkgClient.asset as any).publishFinality(UAL, { minimumNumberOfFinalizationConfirmations: 1 });
      console.log('Asset publish finality result:', JSON.stringify(finalityResult, null, 2));

    // 6. Retrieve the full Knowledge Asset (public + private)
    console.log('6. Retrieving the full Knowledge Asset...');
    const assetData = await dkgClient.asset.get(UAL, { contentType: 'all' });
    console.log('Retrieved Knowledge Asset:', JSON.stringify(assetData, null, 2));

    // 7. Query the Knowledge Asset via SPARQL to verify triples
    console.log('7. Querying the Knowledge Asset via SPARQL...');
    const sparqlQuery = `
      PREFIX schema: <https://schema.org/>
      SELECT ?p ?o WHERE { <${UAL}> ?p ?o . }
    `;
      // Perform SPARQL query on the public repository
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queryPromise = (dkgClient.graph as any).query(
          sparqlQuery,
          'SELECT',
        );
        // Timeout in case the query hangs
        const timeoutMs = 5000;
        const timedQuery = Promise.race([
          queryPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error(`SPARQL query timed out after ${timeoutMs}ms`)), timeoutMs)),
        ]);
        const queryResult = await timedQuery;
    console.log('SPARQL Query Results:', JSON.stringify(queryResult, null, 2));
      } catch (queryErr) {
        console.error('Error during SPARQL query:', queryErr);
      }
  } catch (err) {
    console.warn('Skipping DKG publish due to error:', err);
    UAL = 'mock-ual';
    console.log('Published Knowledge Asset UAL (mock):', UAL);
    }
  }

  console.log('Full user flow test complete.');
}

main().catch(err => {
  console.error('Error during test flow:', err);
  process.exit(1);
}); 