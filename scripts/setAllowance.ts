import * as dotenv from 'dotenv';
import DKG from 'dkg.js';
import { BLOCKCHAIN_IDS } from 'dkg.js/constants';

// Load environment variables from .env
dotenv.config();

async function main() {
  // Instantiate DKG client
  const dkgClient = new DKG({
    environment: process.env.ENVIRONMENT || 'testnet',
    endpoint: process.env.OT_NODE_HOSTNAME!,
    port: Number(process.env.OT_NODE_PORT || '8900'),
    blockchain: {
      name: BLOCKCHAIN_IDS.NEUROWEB_TESTNET,
      publicKey: process.env.PUBLIC_KEY!,
      privateKey: process.env.PRIVATE_KEY!,
    },
  });

  // Optional: verify connection
  try {
    const info = await dkgClient.node.info();
    console.log('Connected to DKG node:', info);
  } catch (err) {
    console.warn('Failed to retrieve node info:', err);
  }

  const threshold = process.env.DKG_ALLOWANCE_THRESHOLD || '1000000000000000000'; // default 1 TRAC
  console.log('Increasing TRAC allowance to:', threshold);
  // Use typed assertion for allowance methods
  const assetAllowance = dkgClient.asset as unknown as {
    increaseAllowance(amount: string): Promise<void>;
    getCurrentAllowance(): Promise<string>;
  };

  await assetAllowance.increaseAllowance(threshold);
  const newAllowance = await assetAllowance.getCurrentAllowance();
  console.log('New TRAC allowance:', newAllowance);
}

main().catch(err => {
  console.error('Error in setAllowance script:', err);
  process.exit(1);
}); 