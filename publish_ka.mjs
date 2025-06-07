#!/usr/bin/env node
import DKG from 'dkg.js';
import { BLOCKCHAIN_IDS } from 'dkg.js/constants';
import 'dotenv/config';

// Initialize DKG client from environment variables
const dkgClient = new DKG({
  environment: process.env.ENVIRONMENT || 'testnet',
  endpoint: process.env.OT_NODE_HOSTNAME,
  port: Number(process.env.OT_NODE_PORT),
  blockchain: {
    name: process.env.BLOCKCHAIN_ID || BLOCKCHAIN_IDS.NEUROWEB_TESTNET,
    publicKey: process.env.PUBLIC_KEY,
    privateKey: process.env.PRIVATE_KEY,
  },
  maxNumberOfRetries: 300,
  frequency: 2,
  contentType: 'all',
  nodeApiVersion: '/v1',
});

(async () => {
  try {
    console.log('Publishing Knowledge Asset...');
    const content = {
      public: {
        '@context': 'https://schema.org',
        '@id': 'urn:test:asset:1',
        '@type': 'CreativeWork',
        name: 'Test DKG Asset',
        description: 'A simple test Knowledge Asset published via dkg.js',
      },
    };
    const result = await dkgClient.asset.create(content, { epochsNum: 2 });
    console.log('Success! Knowledge Asset published:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error publishing Knowledge Asset:', err);
    process.exit(1);
  }
})(); 