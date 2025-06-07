// src/services/protocolService.ts
// import { logger } from '../utils/logger'; // Logger will be passed via context
import type { ElizaOSContext } from "../elizaos/types";
import { solanaService } from './solanaService'; // Wrapper for Solana interactions
// BioDAO integration removed

/**
 * Represents a single item in a safety checklist.
 */
export interface SafetyChecklistItem {
  id: string; // Unique identifier for the checklist item, e.g., "BSL2.PPE.Gloves"
  text: string; // The checklist item text, e.g., "Wear gloves and lab coat."
  is_critical?: boolean; // Indicates if this is a critical safety step
  category: 'BSL-2' | 'BSL-1' | 'GeneralLabSafety' | 'ChemicalSafety' | 'BiohazardWaste';
}

export interface ProtocolTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  required_params: string[];
  solana_program_id: string; // Public key of the on-chain program
  experiment_type?: 'CRISPR' | 'ELISA' | 'PCR' | 'ProteinEngineering' | 'FungalExpression';
  safety_guidelines?: SafetyChecklistItem[];
  parameters: Record<string, unknown>;
  initiator_public_key: string;
  safety_affirmations?: Record<string, boolean>;
  // BioDAO fields removed
}

export interface ProtocolInitiationInput {
  template_id: string;
  hypothesis_id?: string;
  name: string;
  parameters: Record<string, unknown>;
  initiator_public_key: string;
  safety_affirmations?: Record<string, boolean>;
  // BioDAO fields removed
}

export interface ProtocolInstance {
  id: string;
  name: string;
  template_id: string;
  hypothesis_id?: string;
  status: string;
  solana_protocol_account_pda?: string;
  solana_init_transaction_id?: string;
  parameters: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  validation_proof_uri?: string;
  affirmed_safety_items?: Record<string, boolean>; 
  // BioDAO ID field removed
}

const MOCK_TEMPLATES: ProtocolTemplate[] = [
  {
    id: "template-pcr-v1",
    name: "Standard PCR Protocol v1",
    description: "Template for a standard PCR experiment. Covers DNA amplification.",
    version: "1.0",
    required_params: [
      "dna_sample_id",
      "primer_forward",
      "primer_reverse",
      "polymerase_type", // e.g., Taq, Pfu
      "thermal_cycler_program_id", // Link to a predefined program
      "cycles",
    ],
    solana_program_id:
      "PCR1Pgm4QdruXWHCaDoewwrHfqgPK8NSaCFJcVVe4NHR", // Mock Program ID
    experiment_type: "PCR",
    safety_guidelines: [
      { id: "GEN.1", text: "Always wear appropriate Personal Protective Equipment (PPE).", category: "GeneralLabSafety" },
      { id: "PCR.1", text: "Use aerosol-resistant pipette tips to prevent cross-contamination.", category: "GeneralLabSafety" },
      { id: "CHEM.1", text: "Handle Ethidium Bromide (if used for gel visualization) with extreme care in designated areas, wearing appropriate PPE.", category: "ChemicalSafety"}
    ],
    parameters: {},
    initiator_public_key: "publicKey1",
    safety_affirmations: {}
  },
  {
    id: "template-crispr-cas9-v1",
    name: "CRISPR-Cas9 Knockout Protocol v1",
    description: "Template for CRISPR-Cas9 gene knockout in mammalian cells.",
    version: "1.0",
    required_params: [
      "target_gene_sequence", // e.g., NCBI gene ID or sequence
      "guide_rna_sequence",
      "cas_enzyme_type", // e.g., Cas9, Cas12a
      "delivery_method", // e.g., plasmid transfection, RNP electroporation, viral vector
      "cell_line_id",
      "selection_marker_details", // e.g., puromycin @ 2ug/ml for 48h
    ],
    solana_program_id:
      "CRSPR1Pgmxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Mock Program ID
    experiment_type: "CRISPR",
    safety_guidelines: [
      { id: "BSL2.1", text: "Work with mammalian cells must be performed in a certified Class II Biological Safety Cabinet (BSC).", category: "BSL-2", is_critical: true },
      { id: "BSL2.2", text: "Wear gloves, lab coat, and eye protection.", category: "BSL-2" },
      { id: "BSL2.3", text: "Decontaminate all work surfaces with an appropriate disinfectant (e.g., 10% bleach, 70% ethanol) before and after work.", category: "BSL-2", is_critical: true },
      { id: "BSL2.4", text: "All cell culture waste (media, tips, tubes) must be decontaminated (e.g., by autoclaving or chemical disinfection) before disposal.", category: "BiohazardWaste", is_critical: true },
      { id: "CRISPR.1", text: "If using viral vectors (e.g., lentivirus, AAV) for delivery, follow specific BSL-2+ containment procedures for viral work.", category: "BSL-2"}
    ],
    parameters: {},
    initiator_public_key: "publicKey1",
    safety_affirmations: {}
  },
  {
    id: "template-elisa-indirect-v1",
    name: "Indirect ELISA Protocol v1",
    description: "Template for indirect ELISA to detect antibodies.",
    version: "1.0",
    required_params: [
      "antigen_coating_concentration", // e.g., in µg/ml
      "primary_antibody_dilution",
      "secondary_antibody_conjugate_dilution", // e.g., HRP-conjugated anti-species IgG
      "substrate_type", // e.g., TMB, OPD
      "plate_reader_wavelength", // nm
      "sample_matrix_type", // e.g., Serum, Plasma
    ],
    solana_program_id:
      "ELSA1PgmXYskwBcozAd9aZbS8E4vFz9jKYUa8xGwbHWj", // Mock Program ID
    parameters: {},
    initiator_public_key: "publicKey1",
    safety_affirmations: {}
  },
  {
    id: "template-protein-expression-e-coli-v1",
    name: "Protein Expression E.coli Protocol v1",
    description: "Template for recombinant protein expression in E.coli.",
    version: "1.0",
    required_params: [
      "expression_vector_id",
      "host_strain", // e.g., BL21(DE3)
      "inducer_type", // e.g., IPTG
      "induction_conditions_temperature_celsius",
      "induction_conditions_duration_hours",
      "lysis_buffer_id",
      "purification_method", // e.g., Ni-NTA, GST-tag
    ],
    solana_program_id:
      "FNGEXP1Pgmxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Mock Program ID
    experiment_type: "FungalExpression",
    safety_guidelines: [
      { id: "BSL1.Fungi.1", text: "Work with non-pathogenic fungal strains (e.g., S. cerevisiae, P. pastoris) can typically be done at BSL-1.", category: "BSL-1"},
      { id: "BSL1.Fungi.2", text: "Maintain aseptic techniques to prevent contamination of cultures.", category: "GeneralLabSafety"},
      { id: "BSL1.Fungi.3", text: "Decontaminate fungal waste by autoclaving before disposal.", category: "BiohazardWaste"}
    ],
    parameters: {},
    initiator_public_key: "publicKey1",
    safety_affirmations: {}
  },
  {
    id: "template-western-blot-v1",
    name: "Western Blot Protocol v1",
    description: "Template for protein detection by Western Blot.",
    version: "1.0",
    required_params: [
      "protein_sample_source", // e.g., Cell lysate, Tissue homogenate
      "polyacrylamide_gel_percentage",
      "transfer_method", // e.g., Wet, Semi-dry
      "primary_antibody_id_and_dilution",
      "secondary_antibody_id_and_dilution",
      "detection_reagent", // e.g., ECL, Fluorescent
    ],
    solana_program_id:
      "WBLOT1PgmABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl", // Mock Program ID
    parameters: {},
    initiator_public_key: "publicKey1",
    safety_affirmations: {}
  },
  // Added mock templates #6 to #15
  {
    id: "template-6-mock-v1",
    name: "Mock Protocol 6",
    description: "Mock protocol template #6 for demonstration.",
    version: "1.0",
    required_params: [],
    solana_program_id: "MockPgm6xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    experiment_type: "ELISA",
    safety_guidelines: [],
    parameters: {},
    initiator_public_key: "",
    safety_affirmations: {}
  },
  {
    id: "template-7-mock-v1",
    name: "Mock Protocol 7",
    description: "Mock protocol template #7 for demonstration.",
    version: "1.0",
    required_params: [],
    solana_program_id: "MockPgm7xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    experiment_type: "PCR",
    safety_guidelines: [],
    parameters: {},
    initiator_public_key: "",
    safety_affirmations: {}
  },
  {
    id: "template-8-mock-v1",
    name: "Mock Protocol 8",
    description: "Mock protocol template #8 for demonstration.",
    version: "1.0",
    required_params: [],
    solana_program_id: "MockPgm8xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    experiment_type: "CRISPR",
    safety_guidelines: [],
    parameters: {},
    initiator_public_key: "",
    safety_affirmations: {}
  },
  {
    id: "template-9-mock-v1",
    name: "Mock Protocol 9",
    description: "Mock protocol template #9 for demonstration.",
    version: "1.0",
    required_params: [],
    solana_program_id: "MockPgm9xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    experiment_type: "ProteinEngineering",
    safety_guidelines: [],
    parameters: {},
    initiator_public_key: "",
    safety_affirmations: {}
  },
  {
    id: "template-10-mock-v1",
    name: "Mock Protocol 10",
    description: "Mock protocol template #10 for demonstration.",
    version: "1.0",
    required_params: [],
    solana_program_id: "MockPgm10xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    experiment_type: "ELISA",
    safety_guidelines: [],
    parameters: {},
    initiator_public_key: "",
    safety_affirmations: {}
  },
  {
    id: "template-11-mock-v1",
    name: "Mock Protocol 11",
    description: "Mock protocol template #11 for demonstration.",
    version: "1.0",
    required_params: [],
    solana_program_id: "MockPgm11xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    experiment_type: "PCR",
    safety_guidelines: [],
    parameters: {},
    initiator_public_key: "",
    safety_affirmations: {}
  },
  {
    id: "template-12-mock-v1",
    name: "Mock Protocol 12",
    description: "Mock protocol template #12 for demonstration.",
    version: "1.0",
    required_params: [],
    solana_program_id: "MockPgm12xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    experiment_type: "CRISPR",
    safety_guidelines: [],
    parameters: {},
    initiator_public_key: "",
    safety_affirmations: {}
  },
  {
    id: "template-13-mock-v1",
    name: "Mock Protocol 13",
    description: "Mock protocol template #13 for demonstration.",
    version: "1.0",
    required_params: [],
    solana_program_id: "MockPgm13xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    experiment_type: "ProteinEngineering",
    safety_guidelines: [],
    parameters: {},
    initiator_public_key: "",
    safety_affirmations: {}
  },
  {
    id: "template-14-mock-v1",
    name: "Mock Protocol 14",
    description: "Mock protocol template #14 for demonstration.",
    version: "1.0",
    required_params: [],
    solana_program_id: "MockPgm14xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    experiment_type: "ELISA",
    safety_guidelines: [],
    parameters: {},
    initiator_public_key: "",
    safety_affirmations: {}
  },
  {
    id: "template-15-mock-v1",
    name: "Mock Protocol 15",
    description: "Mock protocol template #15 for demonstration.",
    version: "1.0",
    required_params: [],
    solana_program_id: "MockPgm15xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    experiment_type: "PCR",
    safety_guidelines: [],
    parameters: {},
    initiator_public_key: "",
    safety_affirmations: {}
  }
];

class ProtocolService {
  private logger: ElizaOSContext['logger'] = console;
  private isInitialized: boolean = false;

  constructor() {
    // Minimal constructor, initialization happens in initialize()
  }

  public initialize(context: ElizaOSContext): void {
    this.logger = context.logger || console;
    this.isInitialized = true;
    this.logger.info("ProtocolService: Initialized.");
  }

  private ensureInitialized(context: ElizaOSContext): void {
    if (!this.isInitialized) {
      this.logger.warn("ProtocolService: Auto-initializing...");
      this.initialize(context);
    }
  }

  public getProtocolTemplates(context?: ElizaOSContext): ProtocolTemplate[] {
    const effectiveLogger = context?.logger || this.logger;
    effectiveLogger.info("ProtocolService: Fetching protocol templates");
  return MOCK_TEMPLATES;
  }

  public getTemplateDetails(templateId: string, context?: ElizaOSContext): ProtocolTemplate | undefined {
    const effectiveLogger = context?.logger || this.logger;
    effectiveLogger.info("ProtocolService: Fetching details for template", { templateId });
    const template = MOCK_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      effectiveLogger.warn("ProtocolService: Template not found for details", { templateId });
    }
    return template;
  }

  public async prepareProtocolForExecution(
  input: ProtocolInitiationInput,
    context: ElizaOSContext,
  ): Promise<{ validatedParams: Record<string, unknown>; validatedSafetyAffirmations: Record<string, boolean>, template: ProtocolTemplate }> {
    this.ensureInitialized(context); // Ensure service is initialized
    const effectiveLogger = context.logger || this.logger;
    effectiveLogger.info("ProtocolService: Preparing protocol for execution", { templateId: input.template_id });

  const template = MOCK_TEMPLATES.find((t) => t.id === input.template_id);
  if (!template) {
      effectiveLogger.error("ProtocolService: Template not found for preparation", {
      templateId: input.template_id,
    });
    throw new Error(`Protocol template ${input.template_id} not found.`);
  }

    const validatedParams: Record<string, unknown> = {};
  for (const param of template.required_params) {
    if (!(param in input.parameters)) {
        effectiveLogger.error("ProtocolService: Missing required parameter during preparation", { param, templateId: template.id });
      throw new Error(
        `Missing required parameter for template ${template.id}: ${param}`,
      );
    }
      validatedParams[param] = input.parameters[param];
  }

    const validatedSafetyAffirmations: Record<string, boolean> = {};
  if (template.safety_guidelines) {
    const criticalBsl2Guidelines = template.safety_guidelines.filter(
      item => item.category === 'BSL-2' && item.is_critical
    );
      for (const criticalItem of criticalBsl2Guidelines) {
        if (!input.safety_affirmations?.[criticalItem.id]) {
          effectiveLogger.error("ProtocolService: Missing affirmation for critical BSL-2 safety guideline", { itemId: criticalItem.id, templateId: template.id });
          throw new Error(
            `Missing affirmation for critical BSL-2 safety guideline ${criticalItem.id} in template ${template.id}.`,
          );
        }
        validatedSafetyAffirmations[criticalItem.id] = true;
      }
      // Store all provided affirmations, not just critical ones
      if (input.safety_affirmations) {
        for (const key in input.safety_affirmations) {
            if (template.safety_guidelines.some(g => g.id === key)) { // Ensure affirmation is for a known guideline
                validatedSafetyAffirmations[key] = input.safety_affirmations[key];
        }
      }
      }
    }
    effectiveLogger.info("ProtocolService: Protocol parameters and safety affirmations validated.", { numParams: Object.keys(validatedParams).length, numAffirmations: Object.keys(validatedSafetyAffirmations).length });
    return { validatedParams, validatedSafetyAffirmations, template };
    }

  public async initializeProtocolInstance(
    input: ProtocolInitiationInput,
    context: ElizaOSContext,
  ): Promise<ProtocolInstance> {
    this.ensureInitialized(context);
    const effectiveLogger = context.logger || this.logger;
    effectiveLogger.info("ProtocolService: Initializing protocol instance", { inputName: input.name, templateId: input.template_id });

    const { validatedParams, validatedSafetyAffirmations, template } = await this.prepareProtocolForExecution(input, context);

    // BioDAO integration removed - skip inventory checks

    let solanaPda: string | undefined;
    let solanaTxId: string | undefined;
    
    if (template.solana_program_id) {
        try {
            effectiveLogger.info("ProtocolService: Initiating protocol on Solana via solanaService", { templateId: template.id, solanaProgramIdToUse: template.solana_program_id });
            const onChainResult = await solanaService.initializeProtocol(
    template.id,
    input.initiator_public_key,
              validatedParams, 
              context 
            );
            solanaPda = onChainResult.protocolPda;
            solanaTxId = onChainResult.transactionId;
            effectiveLogger.info("ProtocolService: Protocol initiated on Solana successfully", { solanaPda, solanaTxId });
        } catch (error) {
            effectiveLogger.error("ProtocolService: Error initiating protocol on Solana", { 
                templateId: template.id, 
                error: error instanceof Error ? error.message : String(error) 
            });
            // Decide if this is a hard failure or if instance can be created with a failed_onchain_init status
            // For now, we won't create an on-chain record if this fails.
        }
    }

    const instanceId = `protinst-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    // Simplified status: protocols are ready or active on-chain
    const currentStatus = solanaPda && solanaTxId ? 'active_on_chain' : 'ready_for_execution';

    const newInstance: ProtocolInstance = {
      id: instanceId,
    name: input.name,
      template_id: input.template_id,
    hypothesis_id: input.hypothesis_id,
      status: currentStatus,
      solana_protocol_account_pda: solanaPda,
      solana_init_transaction_id: solanaTxId,
      parameters: validatedParams,
      created_at: now,
      updated_at: now,
      affirmed_safety_items: validatedSafetyAffirmations, 
  };

    effectiveLogger.info("ProtocolService: Protocol instance created/prepared", { instanceId: newInstance.id, status: newInstance.status });
    // In a real system, this instance would be persisted to a database.
    return newInstance;
  }
}

export const protocolService = new ProtocolService();
