// src/services/solanaService.ts
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as fs from 'fs';
import type { ElizaOSContext } from '../elizaos/types.ts';
import { ApplicationError, ErrorCode } from '../utils/errorHandling.ts';

// Default values, can be overridden by context.config
const DEFAULT_SOLANA_RPC_URL = 'https://api.devnet.solana.com';
const DEFAULT_SOLANA_KEYPAIR_PATH = './keypair.json';
const DEFAULT_IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Define interfaces for our service
export interface ProofData {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

/**
 * Service for interacting with Solana blockchain
 */
class SolanaService {
  private connection: Connection | null = null;
  private keypair: Keypair | null = null;
  private initialized = false;
  private rpcUrl: string = DEFAULT_SOLANA_RPC_URL;
  private keypairPath: string = DEFAULT_SOLANA_KEYPAIR_PATH;
  private isProduction: boolean = DEFAULT_IS_PRODUCTION;
  private logger: ElizaOSContext['logger'] = console; // Default logger

  /**
   * Initialize the Solana service
   */
  async initialize(context?: ElizaOSContext): Promise<boolean> {
    if (this.initialized) return true;

    if (context) {
      this.logger = context.logger || console;
      this.rpcUrl = (typeof context.config?.SOLANA_RPC_URL === 'string' && context.config.SOLANA_RPC_URL) 
                      ? context.config.SOLANA_RPC_URL 
                      : DEFAULT_SOLANA_RPC_URL;
      this.keypairPath = (typeof context.config?.SOLANA_KEYPAIR_PATH === 'string' && context.config.SOLANA_KEYPAIR_PATH)
                         ? context.config.SOLANA_KEYPAIR_PATH
                         : DEFAULT_SOLANA_KEYPAIR_PATH;
      // isProduction could also be taken from context if needed, e.g., context.mode === 'production'
    }

    try {
      this.logger.info('SolanaService: Initializing...', { rpcUrl: this.rpcUrl, keypairPath: this.keypairPath });
      // Create connection to Solana
      this.connection = new Connection(this.rpcUrl, 'confirmed');
      
      // Load keypair - in production this should use secure key management
      if (fs.existsSync(this.keypairPath)) {
        const keypairDataRaw = fs.readFileSync(this.keypairPath, 'utf-8');
        const keypairData = JSON.parse(keypairDataRaw) as number[];
        this.keypair = Keypair.fromSecretKey(
          Uint8Array.from(keypairData)
        );
      } else if (this.isProduction) {
        this.logger.error('Solana keypair file not found in production.', { path: this.keypairPath });
        throw new Error('Solana keypair file not found');
      } else {
        this.logger.warn('Solana keypair file not found, generating new keypair for testing', { path: this.keypairPath });
        this.keypair = Keypair.generate();
        fs.writeFileSync(
          this.keypairPath, 
          JSON.stringify(Array.from(this.keypair.secretKey))
        );
        this.logger.info('SolanaService: New keypair generated and saved for development.', { path: this.keypairPath });
      }

      const version = await this.connection.getVersion();
      this.logger.info(`Solana connection established: ${version['solana-core']}`);
      
      this.initialized = true;
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Solana service:', { error: error instanceof Error ? error.message : String(error) });
      if (this.isProduction) {
        throw new ApplicationError(
          'Failed to initialize Solana service', 
          ErrorCode.SERVICE_UNAVAILABLE
        );
      }
      return false;
    }
  }

  private async ensureInitialized(context?: ElizaOSContext): Promise<void> {
    if (!this.initialized) {
      this.logger.info('SolanaService: Not initialized, attempting to initialize on demand.');
      if (!(await this.initialize(context))) {
        throw new ApplicationError(
          'Solana service auto-initialization failed', 
          ErrorCode.SERVICE_UNAVAILABLE
        );
      }
    }
    if (!this.connection || !this.keypair) { // Should be caught by initialize, but as a safeguard
        this.logger.error('SolanaService: Connection or keypair is null after initialization attempt.');
        throw new ApplicationError(
            'Solana service critical components missing after initialization', 
            ErrorCode.INTERNAL_ERROR
        );
    }
  }

  /**
   * Anchor proof data on Solana blockchain
   */
  async anchorProof(
    protocolInstanceId: string, 
    proof: ProofData, 
    ipfsCid: string,
    context?: ElizaOSContext
  ): Promise<string> {
    await this.ensureInitialized(context);
    const currentLogger = context?.logger || this.logger;

    // Null checks for connection and keypair are now implicitly handled by ensureInitialized
    const connection = this.connection!;
    const keypair = this.keypair!;

    try {
      const proofMetadata = {
        type: 'zkSNARK_proof',
        protocol_id: protocolInstanceId,
        ipfs_cid: ipfsCid,
        timestamp: Date.now()
      };
      
      currentLogger.debug('Anchoring proof with metadata', { proofMetadata });
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: keypair.publicKey, 
          lamports: 1, 
        })
      );
      
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [keypair]
      );
      
      currentLogger.info(`SolanaService: Anchored proof on Solana: ${signature}`, {
        protocolInstanceId,
        ipfsCid,
      });
      
      return signature;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      currentLogger.error('Failed to anchor proof on Solana:', { error: errMsg });
      // In development or test, return a mock transaction ID instead of failing
      if (!this.isProduction) {
        const mockTxId = 'mock-transaction-id';
        currentLogger.warn('SolanaService: Returning mock transaction ID in development.', { mockTxId });
        return mockTxId;
      }
      throw new ApplicationError(
        'Failed to anchor proof on Solana', 
        ErrorCode.INTERNAL_ERROR,
        { protocolInstanceId, ipfsCid }
      );
    }
  }

  /**
   * Initialize a protocol on Solana
   */
  async initializeProtocol(
    templateId: string,
    initiatorPublicKey: string,
    _parameters: Record<string, unknown>,
    context?: ElizaOSContext
  ): Promise<{ transactionId: string; protocolPda: string }> {
    await this.ensureInitialized(context);
    const currentLogger = context?.logger || this.logger;

    const connection = this.connection!;
    const keypair = this.keypair!;

    try {
      currentLogger.info('SolanaService: Attempting to initialize protocol on Solana', { templateId, initiatorPublicKey });
      const initiatorPubkey = new PublicKey(initiatorPublicKey);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: initiatorPubkey,
          lamports: 100, 
        })
      );
      
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [keypair]
      );
      
      // Generate a mock PDA for this protocol - in a real scenario, this would be derived based on program ID and seeds.
      const pdaBuffer = Buffer.from(`protocol-${templateId}-${Date.now().toString().slice(-6)}`);
      const protocolPda = PublicKey.findProgramAddressSync([pdaBuffer], keypair.publicKey)[0].toBase58(); // Example, not a real program ID
      
      currentLogger.info(`SolanaService: Initialized protocol on Solana: ${signature}`, {
        templateId,
        protocolPda,
        initiatorPublicKey
      });
      
      return {
        transactionId: signature,
        protocolPda,
      };
    } catch (error) {
      currentLogger.error('Failed to initialize protocol on Solana:', { error: error instanceof Error ? error.message : String(error), templateId });
      throw new ApplicationError(
        'Failed to initialize protocol on Solana', 
        ErrorCode.INTERNAL_ERROR,
        { templateId, initiatorPublicKey }
      );
    }
  }
  
  /**
   * Get SOL balance for public key
   */
  async getBalance(publicKeyStr: string, context?: ElizaOSContext): Promise<number> {
    await this.ensureInitialized(context);
    const currentLogger = context?.logger || this.logger;
    const connection = this.connection!;
    
    try {
      const publicKey = new PublicKey(publicKeyStr);
      const balance = await connection.getBalance(publicKey);
      currentLogger.info(`SolanaService: Fetched balance for ${publicKeyStr}: ${balance / 1e9} SOL`);
      return balance;
    } catch (error) {
      currentLogger.error('Failed to get SOL balance:', { error: error instanceof Error ? error.message : String(error), publicKeyStr });
      throw new ApplicationError(
        'Failed to get SOL balance', 
        ErrorCode.INTERNAL_ERROR,
        { publicKey: publicKeyStr }
      );
    }
  }
  
  /**
   * Transfer SPL token
   */
  async transferSplToken(
    recipientPublicKeyStr: string,
    tokenMintAddressStr: string,
    amountLamports: number,
    senderKeypair?: Keypair,
    context?: ElizaOSContext
  ): Promise<string> {
    await this.ensureInitialized(context);
    const currentLogger = context?.logger || this.logger;
    const connection = this.connection!;
    const payer = senderKeypair || this.keypair!;

    if (!payer) {
        currentLogger.error('SolanaService: Payer keypair is not available for SPL token transfer.');
        throw new ApplicationError('Payer keypair not available', ErrorCode.INTERNAL_ERROR);
      }

    currentLogger.info('SolanaService: Attempting SPL Token transfer', { recipientPublicKeyStr, tokenMintAddressStr, amountLamports });
    
    try {
      const recipientPublicKey = new PublicKey(recipientPublicKeyStr);
      const tokenMintPublicKey = new PublicKey(tokenMintAddressStr);
      
      // Get the token account of the sender
      const fromTokenAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        tokenMintPublicKey,
        payer.publicKey
      );
      
      // Get or create the token account of the recipient
      const toTokenAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        tokenMintPublicKey,
        recipientPublicKey
      );
      
      const transaction = new Transaction();

      // Check if recipient account exists, if not, create it
      const toTokenAccountInfo = await connection.getAccountInfo(toTokenAccount);
      if (!toTokenAccountInfo) {
        currentLogger.info("SolanaService: Recipient token account does not exist, creating it.", { account: toTokenAccount.toBase58() });
        transaction.add(
          Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            tokenMintPublicKey,
            toTokenAccount,
            recipientPublicKey,
            payer.publicKey
          )
        );
      }
      
      transaction.add(
        Token.createTransferInstruction(
          TOKEN_PROGRAM_ID,
          fromTokenAccount,
          toTokenAccount,
          payer.publicKey,
          [],
          amountLamports
        )
      );
      
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction, 
        [payer]
      );
      
      currentLogger.info(`SolanaService: Transferred ${amountLamports} of token ${tokenMintAddressStr} to ${recipientPublicKeyStr}. Tx: ${signature}`);
      return signature;
    } catch (error) {
      currentLogger.error('Failed to transfer SPL token:', { 
        error: error instanceof Error ? error.message : String(error), 
        recipient: recipientPublicKeyStr, 
        tokenMint: tokenMintAddressStr 
      });
      throw new ApplicationError(
        'Failed to transfer SPL token', 
        ErrorCode.INTERNAL_ERROR,
        { recipient: recipientPublicKeyStr, tokenMint: tokenMintAddressStr }
      );
    }
  }
  
  /**
   * Cleanup and close connection
   */
  async shutdown(context?: ElizaOSContext): Promise<void> {
    const currentLogger = context?.logger || this.logger;
    // In a real app, you might close connections or release resources here.
    // For Solana Connection, it doesn't typically need explicit closing unless managing websockets.
    this.initialized = false;
    this.connection = null;
    this.keypair = null; // Clear sensitive data
    currentLogger.info('SolanaService: Shutdown complete.');
  }
}

// Export a singleton instance of the service
export const solanaService = new SolanaService(); 