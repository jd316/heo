// src/services/validationService.ts
import { logger } from "../utils/logger";
import type { ElizaOSContext } from "../elizaos/types";
import { solanaService } from './solanaService'; // For on-chain proof anchoring
import { ipfsService } from './ipfsService'; // For storing raw data
import { runGroth16Prover, type ExperimentalData } from './zkSnarkService'; // For zkSNARK proof generation

export interface ExperimentResultInput {
  protocol_instance_id: string;
  raw_data: ExperimentalData; // Changed from unknown to ExperimentalData
  metadata: {
    executed_by: string; // User ID or lab ID
    execution_timestamp: string; // ISO 8601
    // Other relevant metadata: instrument IDs, conditions, etc.
  };
}

export interface ValidationStatus {
  protocol_instance_id: string;
  validation_job_id?: string;
  status:
    | "pending_proof"
    | "proving"
    | "proof_generated"
    | "anchoring_on_chain"
    | "validated_on_chain"
    | "validation_failed"
    | "human_review_required";
  proof_uri?: string; // e.g., Solana transaction ID or account storing the proof
  ipfs_data_cid?: string; // CID for raw data stored on IPFS
  error_message?: string;
  timestamp: string;
}

// As per PRD: Groth16 proving system (3.2s/proof)
// As per PRD: Solana Proof-of-History timestamping
const validateExperimentResults = async (
  input: ExperimentResultInput,
  _context?: ElizaOSContext,
): Promise<ValidationStatus> => {
  logger.info(
    "ValidationService: Received request to validate experiment results",
    input,
  );

  // We used to need this for IPFS operations, but now the ipfsService doesn't need context
  const _effectiveContext: ElizaOSContext = _context ?? { config: { ...process.env }, logger: console };
  
  const {
    protocol_instance_id,
    raw_data,
    metadata,
  } = input;

  try {
    // Create validation job
    const validationJobId = `validation-${Date.now()}-${Math.random().toString(16).substring(2)}`;
    
    // Initial status - will be updated as we progress
    const validationStatus: ValidationStatus = {
      protocol_instance_id,
      validation_job_id: validationJobId,
      status: "pending_proof",
      timestamp: new Date().toISOString(),
    };

    // 1. Store raw_data on IPFS
    logger.info("ValidationService: Storing raw data on IPFS");
    validationStatus.status = "pending_proof";
    
    // Convert the data to JSON string for IPFS storage
    const ipfsData = JSON.stringify({
      protocol_instance_id,
      raw_data,
      metadata,
      timestamp: new Date().toISOString(),
    });
    const ipfsCid = await ipfsService.store(ipfsData);
    
    validationStatus.ipfs_data_cid = ipfsCid;
    validationStatus.timestamp = new Date().toISOString();
    logger.info("ValidationService: Raw data stored on IPFS", { cid: ipfsCid });

    // 2. Generate zkSNARK proof
  logger.info(
      "ValidationService: Starting zkSNARK proof generation for protocol:",
    protocol_instance_id,
  );
    validationStatus.status = "proving";
    validationStatus.timestamp = new Date().toISOString();
    
    // Use the zkSnarkService to generate a proof
    const proofResult = await runGroth16Prover(
      protocol_instance_id,
      raw_data
    );
    
    validationStatus.status = "proof_generated";
    validationStatus.timestamp = new Date().toISOString();
    logger.info("ValidationService: zkSNARK proof generated successfully");

    // 3. Anchor proof on Solana
    logger.info("ValidationService: Anchoring proof on Solana");
    validationStatus.status = "anchoring_on_chain";
    validationStatus.timestamp = new Date().toISOString();
    
    // Use the solanaService to anchor the proof on-chain
    const solanaTxId = await solanaService.anchorProof(
    protocol_instance_id,
      proofResult.proof,
      ipfsCid
    );
    
    // Update final status
    validationStatus.status = "validated_on_chain";
    validationStatus.proof_uri = `solana://${solanaTxId}`;
    validationStatus.timestamp = new Date().toISOString();
    logger.info("ValidationService: Proof successfully anchored on Solana", {
      txId: solanaTxId,
    });

  // Handle human-in-the-loop validation gates if model hallucination risk is high (as per PRD risk mitigation)
    // This would be a more complex algorithm in production
    const needsHumanReview = Math.random() < 0.05; // 5% chance for demo purposes
    if (needsHumanReview) {
      validationStatus.status = "human_review_required";
      validationStatus.timestamp = new Date().toISOString();
      logger.info("ValidationService: Flagged for human review due to complexity or novelty");
    }

  logger.info(
    "ValidationService: Validation process complete",
      validationStatus,
  );
    return validationStatus;
  } catch (error) {
    logger.error("ValidationService: Error during validation process", error);
    
    // Return failure status with error details
    return {
      protocol_instance_id,
      status: "validation_failed",
      error_message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
};

export const validationService = {
  validateExperimentResults,
  // getValidationStatus,
};
