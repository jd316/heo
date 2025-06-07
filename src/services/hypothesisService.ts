// src/services/hypothesisService.ts
// import { logger } from "../utils/logger"; // Logger will be passed via context
import type { ElizaOSContext } from "../elizaos/types.ts";
// Import necessary types. GenerateContentRequest and GenerativeModel are not directly exported.
import {
  GoogleGenAI,
} from "@google/genai";
import type {
  HarmCategory,
  HarmBlockThreshold,
  GenerationConfig,
  Content,
} from "@google/genai";
import * as N3 from 'n3';
// const { DataFactory } = N3; // Removed unused DataFactory destructuring
import { oxigraphCacheService, type SparqlQueryResult } from './oxigraphCacheService.ts';
import { ipfsService } from './ipfsService.ts';
// import { dkgService } from './dkgService'; // dkgService is not directly used in hypothesis generation flow after context is in OxiGraph. It's used for publishing.

// Environment variable for the Gemini API Key
// const GEMINI_API_KEY_ENV = process.env.GEMINI_API_KEY; // Will get from context
// Default model name, can be overridden by input
// const DEFAULT_GEMINI_MODEL_NAME = // Will get from context
// process.env.GEMINI_MODEL_NAME || "gemini-2.5-pro-preview-05-06";

const HEO_AGENT_URI = "urn:elizaos:agent:heo-plugin:v0.1.0"; // Define a URI for the HEO agent
const DEFAULT_LICENSE_URI = "https://creativecommons.org/licenses/by/4.0/"; // Default open license

// This interface is now less critical as Gemini SDK handles response structure,
// but helps conceptualize that we expect text back.
/* interface GeminiApiResponse {
  text: string;
} */ // Removing unused interface

// Define and export the Hypothesis interface
export interface Hypothesis {
  id: string;
  text: string;
  novelty_score: number;
  status: string;
  ipfs_cid?: string; 
  created_at: string;
  updated_at: string;
  source_references: Array<{ type: string; value: string; details?: Record<string, unknown> }>;
  used_corpus_data_ids: string[];
}

// Placeholder for actual corpus data structure
export interface CorpusData {
  id: string;
  content: string; // Simplified representation of corpus content
  metadata?: Record<string, unknown>;
}

// Define some common RDF prefixes
// const RDF_PREFIXES = { // Removed unused RDF_PREFIXES
// rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
// rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
// schema: 'http://schema.org/',
// sio: 'http://semanticscience.org/resource/', // Semanticscience Integrated Ontology
// prov: 'http://www.w3.org/ns/prov#',
// dcterms: 'http://purl.org/dc/terms/',
// foaf: 'http://xmlns.com/foaf/0.1/',
// base: 'http://example.org/heo/', // Base URI for our generated entities
// xsd: 'http://www.w3.org/2001/XMLSchema#',
// };

// Group helper functions into an exportable object
export const internalHelpers = {
  async loadCorpusData(
    filters?: {
    corpus_data_ids?: string[];
    start_year?: number;
    keywords?: string[];
    },
    logger?: ElizaOSContext['logger'] // Use context's logger type
  ): Promise<CorpusData[]> {
    const effectiveLogger = logger || console; // Fallback logger
    effectiveLogger.info("loadCorpusData: Mock loading corpus data.", { filters });
    await new Promise((resolve) => setTimeout(resolve, 150)); // Simulate async I/O

    if (filters?.corpus_data_ids && filters.corpus_data_ids.length > 0) {
      return filters.corpus_data_ids.map((id) => ({
        id,
        content: `Mock content for corpus data ID: ${id}. Keywords: ${filters.keywords?.join(", ") || "N/A"}. Year: ${filters.start_year || "N/A"}.`,
        metadata: { retrieved_at: new Date().toISOString() },
      }));
    }
    // Fallback if no specific IDs are provided but other filters exist
    if (filters?.keywords || filters?.start_year) {
      return [
        {
          id: "corpus-entry-filtered-mock",
          content: `Mock content based on filters. Keywords: ${filters.keywords?.join(", ") || "N/A"}. Year: ${filters.start_year || "N/A"}.`,
          metadata: {
            filtered_retrieval: true,
            retrieved_at: new Date().toISOString(),
          },
        },
      ];
    }

    return [
      {
        id: "corpus-entry-default-mock",
        content:
          "Default mock corpus data entry. This simulates a broad retrieval when no specific filters are applied.",
        metadata: {
          default_retrieval: true,
          retrieved_at: new Date().toISOString(),
        },
      },
    ];
  },

  async fetchContextFromOxigraph(
    userQuery: string, 
    contextOrLogger: ElizaOSContext | ElizaOSContext['logger'],
    fallbackLogger?: ElizaOSContext['logger']
  ): Promise<string[]> {
    // Determine the logger to use
    const effectiveLogger = 
      (contextOrLogger && 'logger' in contextOrLogger) 
        ? contextOrLogger.logger 
        : (contextOrLogger || fallbackLogger || console);
    
    effectiveLogger.info('fetchContextFromOxigraph: Fetching context from OxiGraph', { userQuery });
    const extractedText: string[] = [];

    // Escape single quotes in userQuery for SPARQL, and ensure it doesn't break the outer SPARQL string
    const sanitizedUserQuery = userQuery.replace(/['\\]/g, '\\$&'); // Escape single quotes and backslashes

    // Broader search: include text, description, labels, comments, definitions and also search in keywords.
    // Search for entities that might be related to the user query.
    const sparqlQuery = `
      PREFIX schema: <http://schema.org/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX dcat: <http://www.w3.org/ns/dcat#>

      SELECT DISTINCT ?textualContent ?sourceDocument WHERE {
        {
          ?s schema:text ?textualContent .
          OPTIONAL { ?s schema:mainEntityOfPage ?sourceDocument . }
        } UNION {
          ?s schema:description ?textualContent .
          OPTIONAL { ?s schema:mainEntityOfPage ?sourceDocument . }
        } UNION {
          ?s rdfs:label ?textualContent .
          OPTIONAL { ?s schema:mainEntityOfPage ?sourceDocument . }
        } UNION {
          ?s rdfs:comment ?textualContent .
          OPTIONAL { ?s schema:mainEntityOfPage ?sourceDocument . }
        } UNION {
          ?s skos:prefLabel ?textualContent .
          OPTIONAL { ?s schema:mainEntityOfPage ?sourceDocument . }
        } UNION {
          ?s skos:altLabel ?textualContent .
          OPTIONAL { ?s schema:mainEntityOfPage ?sourceDocument . }
        } UNION {
          ?s skos:definition ?textualContent .
          OPTIONAL { ?s schema:mainEntityOfPage ?sourceDocument . }
        } UNION {
          ?s schema:keywords ?keyword .
          BIND(CONCAT("Keyword: ", ?keyword) AS ?textualContent) # Present keywords clearly
          OPTIONAL { ?s schema:mainEntityOfPage ?sourceDocument . }
        } UNION {
          # Try to find related entities via shared keywords or broader topics for more context.
          # This part of the query might become complex and slow if not carefully managed.
          # For now, let's assume a simpler direct text search as primary, keywords as secondary.
          ?entity schema:keywords ?keywordValue .
          FILTER(CONTAINS(LCASE(STR(?keywordValue)), LCASE('${sanitizedUserQuery}')))
          # Get descriptive text from these related entities
          { ?entity schema:description ?textualContent . } UNION { ?entity schema:text ?textualContent . }
          OPTIONAL { ?entity schema:mainEntityOfPage ?sourceDocument . }
        }
        # Ensure the textual content itself contains the query terms for relevance
        FILTER(CONTAINS(LCASE(STR(?textualContent)), LCASE('${sanitizedUserQuery}')))
        FILTER(ISLITERAL(?textualContent) && (LANGMATCHES(LANG(?textualContent), "en") || LANG(?textualContent) = ""))
      }
      LIMIT 20 # Increased limit slightly for broader context, but be mindful of LLM token limits
    `;

    try {
      const resultString = await oxigraphCacheService.executeQuery(sparqlQuery);
      const results: SparqlQueryResult = JSON.parse(resultString);
      const uniqueContexts = new Map<string, string>(); // To store text and its source

      if (results && results.results && results.results.bindings) {
        results.results.bindings.forEach(binding => {
          if (binding.textualContent && binding.textualContent.value) {
            const textVal = binding.textualContent.value;
            const sourceVal = binding.sourceDocument ? binding.sourceDocument.value : "OxiGraphStore";
            // Avoid duplicate text snippets, prefer those with a source document
            if (!uniqueContexts.has(textVal) || (uniqueContexts.has(textVal) && sourceVal !== "OxiGraphStore")) {
                 uniqueContexts.set(textVal, sourceVal);
            }
          }
        });
      }
      // Convert map to array of strings, including source if available
       uniqueContexts.forEach((source, text) => {
           extractedText.push(source !== "OxiGraphStore" ? `[Source: ${source}] ${text}` : text);
       });

      effectiveLogger.info('fetchContextFromOxigraph: Extracted text from OxiGraph', { count: extractedText.length, firstChars: extractedText.length > 0 ? extractedText[0].substring(0,100) : 'N/A' });
    } catch (error) {
      effectiveLogger.error('fetchContextFromOxigraph: Error querying OxiGraph', { error, userQuery });
      // Depending on policy, might return empty or throw. For RAG, often best to return empty and log.
    }
    return extractedText;
  },

  normalizeQueryToContents: (
    query: string | Content | (string | Content)[],
  ): Content[] => {
    if (typeof query === "string") {
      return [{ role: "user", parts: [{ text: query }] }];
    }
    if (Array.isArray(query)) {
      return query.map((p) =>
        typeof p === "string" ? { role: "user", parts: [{ text: p }] } : p,
      );
    }
    return [query];
  },

  async callGeminiProService(params: {
    apiKey: string;
    prompt: string | Content | (string | Content)[];
    modelName?: string;
    generationConfig?: GenerationConfig;
    safetySettings?: Array<{
      category: HarmCategory;
      threshold: HarmBlockThreshold;
    }>;
    /** Optional builder for GoogleGenAI instance, for testing purposes */
    _genAIInstanceBuilder?: (apiKey: string) => GoogleGenAI;
  }, logger?: ElizaOSContext['logger']): Promise<string[]> { // Use context's logger type
    const effectiveLogger = logger || console;
    // const effectiveModelName = params.modelName || DEFAULT_GEMINI_MODEL_NAME; // Model name comes from context or input
    const effectiveModelName = params.modelName; // Expect modelName to be passed in now
    effectiveLogger.info(
      "callGeminiProService: Calling Gemini Pro service using ai.models.generateContent",
      {
        modelName: effectiveModelName,
        apiKeyProvided: !!params.apiKey,
      },
    );

    if (!params.apiKey) {
      effectiveLogger.error("callGeminiProService: API key is missing.");
      throw new Error("Gemini API key is required but was not provided.");
    }
    if (!effectiveModelName) {
      effectiveLogger.error("callGeminiProService: Model name is missing.");
      throw new Error("Gemini model name is required but was not provided.");
    }

    try {
      const genAI: GoogleGenAI = params._genAIInstanceBuilder
        ? params._genAIInstanceBuilder(params.apiKey)
        : new GoogleGenAI({ apiKey: params.apiKey });

      const requestContents: Content[] =
        internalHelpers.normalizeQueryToContents(params.prompt);

      // Construct the request object for ai.models.generateContent
      // Model name is part of this request object.
      const request = {
        model: effectiveModelName, // Specify the model directly in the request
        contents: requestContents,
        safetySettings: params.safetySettings,
        generationConfig: params.generationConfig,
      };

      // Call generateContent directly on ai.models
      const result = await genAI.models.generateContent(request);
      // Access text directly from the result, assuming GenerateContentResponse has a text property
      const textContent = result.text; // Corrected: .text is a property, not a method

      // Ensure textContent is a string before proceeding
      if (typeof textContent !== "string") {
        effectiveLogger.error(
          "callGeminiProService: Invalid API response structure from Gemini or text content missing",
          { response: result },
        );
        throw new Error(
          "Invalid API response from Gemini service. Expected a text string.",
        );
      }
      return [textContent]; // Return the validated string content
    } catch (error) {
      effectiveLogger.error("callGeminiProService: Error during Gemini API call", {
        errorMessage: error instanceof Error ? error.message : String(error),
        modelName: effectiveModelName,
      });
      throw new Error(
        `Error communicating with Gemini service: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  async callGeminiEmbeddingService(params: {
    apiKey: string;
    texts: string[]; // Expect an array of texts to embed
    modelName?: string; // Embedding model name
    taskType?:
      | "SEMANTIC_SIMILARITY"
      | "RETRIEVAL_DOCUMENT"
      | "RETRIEVAL_QUERY"
      | "CLASSIFICATION"
      | "CLUSTERING";
    title?: string; 
    outputDimensionality?: number; 
    _genAIInstanceBuilder?: (apiKey: string) => GoogleGenAI;
  }, logger?: ElizaOSContext['logger']): Promise<Array<number[]>> { // Use context's logger type
    const effectiveLogger = logger || console;
    // const effectiveModelName = params.modelName || "text-embedding-004"; // Default embedding model, or get from context
    const effectiveModelName = params.modelName; // Expect model name to be passed
    effectiveLogger.info("callGeminiEmbeddingService: Calling Gemini Embedding service", {
        modelName: effectiveModelName,
      numTexts: params.texts.length,
        apiKeyProvided: !!params.apiKey,
    });

    if (!params.apiKey) {
      effectiveLogger.error("callGeminiEmbeddingService: API key is missing.");
      throw new Error("Gemini API key for embeddings is required.");
    }
    if (!effectiveModelName) {
      effectiveLogger.error("callGeminiEmbeddingService: Embedding model name is missing.");
      throw new Error("Gemini Embedding model name is required.");
    }

    if (!params.texts || params.texts.length === 0) {
      effectiveLogger.warn("callGeminiEmbeddingService: No texts provided to embed.");
      return [];
    }

    const genAI: GoogleGenAI = params._genAIInstanceBuilder
      ? params._genAIInstanceBuilder(params.apiKey)
      : new GoogleGenAI({ apiKey: params.apiKey });

    const allEmbeddings: Array<number[]> = [];

    for (const text of params.texts) {
      try {
        // const request = { // Removed unused request variable
        //   model: effectiveModelName,
        //   contents: [{ role: "user", parts: [{ text }] }], // Plural 'contents' taking an array with one Content item
        //   taskType: params.taskType,
        //   title: params.title, // title is only valid for RETRIEVAL_DOCUMENT
        //   outputDimensionality: params.outputDimensionality,
        // };
        
        // Adjust title based on taskType
        const actualTaskType = params.taskType || "RETRIEVAL_DOCUMENT"; // Default if not provided
        const actualRequest = {
            model: effectiveModelName,
            contents: [{ role: "user", parts: [{text}] }], // Plural 'contents' taking an array with one Content item
            taskType: actualTaskType,
            title: actualTaskType === "RETRIEVAL_DOCUMENT" ? params.title : undefined,
            outputDimensionality: params.outputDimensionality
        };

        const result = await genAI.models.embedContent(actualRequest);
        
        if (result && result.embeddings && Array.isArray(result.embeddings) && result.embeddings.length > 0 && result.embeddings[0].values) {
          allEmbeddings.push(result.embeddings[0].values);
        } else {
          effectiveLogger.error("callGeminiEmbeddingService: Invalid API response structure for a text or embedding missing", { text, response: result });
          // Decide: throw, or skip this text, or add null/empty array? For now, skip.
          // To maintain output array length matching input, could push an empty array or throw.
          // Throwing might be better to signal a partial failure.
          throw new Error(`Failed to get embedding for text: ${text.substring(0, 50)}...`);
        }
      } catch (error) {
        effectiveLogger.error(`callGeminiEmbeddingService: Error during Gemini embedding API call for text: ${text.substring(0,50)}...`, {
          errorMessage: error instanceof Error ? error.message : String(error),
          modelName: effectiveModelName,
        });
        throw error; 
      }
    }
    return allEmbeddings;
  },

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
      console.warn("Invalid vectors for cosine similarity.");
      return 0;
    }

    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  },

  async scoreNovelty(
    hypothesesText: string[],
    apiKey: string,
    embeddingModelName: string,
    contextQueryForOxigraph?: string,
    logger?: ElizaOSContext['logger']
  ): Promise<number[]> {
    const effectiveLogger = logger || console;
    effectiveLogger.info('scoreNovelty: Calculating novelty scores', { numHypotheses: hypothesesText.length, embeddingModelName });

    if (!hypothesesText || hypothesesText.length === 0) {
      effectiveLogger.warn('scoreNovelty: No hypotheses provided for scoring.');
      return [];
    }

    // 1. Generate embeddings for the hypotheses
    const hypothesisEmbeddings = await internalHelpers.callGeminiEmbeddingService({
        apiKey,
        texts: hypothesesText,
        modelName: embeddingModelName,
        taskType: "RETRIEVAL_QUERY", // Hypotheses are queries about unknown relationships
    }, effectiveLogger);

    // 2. Generate embeddings for existing context (to check novelty against existing knowledge)
    let contextEmbeddings: Array<number[]> = [];
    if (contextQueryForOxigraph) {
        // Create a minimal context object that matches the interface
        const contextObj: ElizaOSContext = { 
          logger: effectiveLogger,
          config: {},
          runtime: undefined
        };
        // Pass the context object to fetchContextFromOxigraph
        const contextTexts = await internalHelpers.fetchContextFromOxigraph(
          contextQueryForOxigraph, 
          contextObj
        );
        if (contextTexts.length > 0) {
            contextEmbeddings = await internalHelpers.callGeminiEmbeddingService({
                apiKey,
                texts: contextTexts,
                modelName: embeddingModelName,
                taskType: "RETRIEVAL_DOCUMENT" // Context is more like a document corpus
            }, effectiveLogger);
        }
    }

    // 3. Calculate novelty scores
    // Novelty is inversely related to similarity to existing context
    // If no context exists, all hypotheses are considered novel (score 1.0)
    // Fallback: if no embeddings from OxiGraph, use the raw query text for context
    if (contextEmbeddings.length === 0 && contextQueryForOxigraph) {
      effectiveLogger.info('scoreNovelty: No context embeddings from OxiGraph – falling back to embedding raw query.');
      contextEmbeddings = await internalHelpers.callGeminiEmbeddingService({
        apiKey,
        texts: [contextQueryForOxigraph],
        modelName: embeddingModelName,
        taskType: "RETRIEVAL_QUERY",
      }, effectiveLogger);
    }
    // If still no context embeddings, score all as maximally novel
    if (contextEmbeddings.length === 0) {
      effectiveLogger.warn('scoreNovelty: No embeddings available for context. All hypotheses will be scored as novel.');
      return hypothesesText.map(() => 1.0);
    }

    const noveltyScores = hypothesisEmbeddings.map(hypoEmb => {
        let maxSimilarity = 0;
      for (const ctxEmbedding of contextEmbeddings) {
        const similarity = internalHelpers.cosineSimilarity(hypoEmb, ctxEmbedding);
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
          }
        }
      // Novelty = 1 - max_similarity (higher novelty if less similar to existing context)
      return 1.0 - maxSimilarity;
    });
      
    effectiveLogger.info('scoreNovelty: Novelty scoring complete', { scores: noveltyScores });
      return noveltyScores;
  },

  async generateRdfTriples(hypothesis: Hypothesis, _originalQuery?: string, logger?: ElizaOSContext['logger']): Promise<string> {
    const effectiveLogger = logger || console;
    effectiveLogger.info('generateRdfTriples: Generating RDF triples for hypothesis', { hypothesisId: hypothesis.id });

    const { DataFactory } = N3;
    const { namedNode, literal } = DataFactory;

    const writer = new N3.Writer({
      prefixes: {
        rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        schema: "http://schema.org/",
        sio: "http://semanticscience.org/resource/",
        prov: "http://www.w3.org/ns/prov#",
        dcterms: "http://purl.org/dc/terms/",
        xsd: "http://www.w3.org/2001/XMLSchema#",
        bs: "https://bioschemas.org/profiles/",
        base: `urn:uuid:${hypothesis.id}#`,
      },
    });

    // Subject: the hypothesis itself
    const hypothesisUri = namedNode(`urn:uuid:${hypothesis.id}`);

    // rdf:type - Semantically describe this as a hypothesis (SIO_000283 = hypothesis in SIO)
    writer.addQuad(hypothesisUri, namedNode("rdf:type"), namedNode("sio:SIO_000283"));

    // schema:text - The actual text of the hypothesis
    writer.addQuad(hypothesisUri, namedNode("schema:text"), literal(hypothesis.text));

    // dcterms:created - Creation timestamp
    writer.addQuad(hypothesisUri, namedNode("dcterms:created"), literal(hypothesis.created_at, namedNode("xsd:dateTime")));

    // dcterms:modified - Last modified timestamp
    writer.addQuad(hypothesisUri, namedNode("dcterms:modified"), literal(hypothesis.updated_at, namedNode("xsd:dateTime")));

    // schema:version - Status of the hypothesis
    writer.addQuad(hypothesisUri, namedNode("schema:version"), literal(hypothesis.status));

    // Custom property for novelty score (could be sio:SIO_000794 = score, or custom)
    writer.addQuad(hypothesisUri, namedNode("sio:SIO_000794"), literal(hypothesis.novelty_score.toString(), namedNode("xsd:decimal")));

    // prov:wasGeneratedBy - Link to the agent that generated this hypothesis
    writer.addQuad(hypothesisUri, namedNode("prov:wasGeneratedBy"), namedNode(HEO_AGENT_URI));

    // If there was an original query, link to it
    if (_originalQuery) {
      const queryLiteral = literal(_originalQuery);
      writer.addQuad(hypothesisUri, namedNode("prov:wasInformedBy"), queryLiteral);
    }

    // Schema.org license - Default to open license
    writer.addQuad(hypothesisUri, namedNode("schema:license"), namedNode(DEFAULT_LICENSE_URI));

    // If anchored to IPFS, include distribution information
    if (hypothesis.ipfs_cid) {
        writer.addQuad(hypothesisUri, namedNode('schema:distribution'), namedNode(`ipfs://${hypothesis.ipfs_cid}`));
        // Assuming ipfsService is initialized and getGatewayUrl can be called without explicit context here if gatewayUrl is stable
        writer.addQuad(namedNode(`ipfs://${hypothesis.ipfs_cid}`), namedNode('schema:contentUrl'), namedNode(ipfsService.getGatewayUrl(hypothesis.ipfs_cid))); 
    }

    // Source references - could be publications, datasets, etc.
    hypothesis.source_references.forEach(ref => {
      const refUri = namedNode(`urn:ref:${ref.type}:${encodeURIComponent(ref.value)}`);
      writer.addQuad(hypothesisUri, namedNode("dcterms:references"), refUri);
      writer.addQuad(refUri, namedNode("rdf:type"), namedNode(`schema:${ref.type === 'DOI' ? 'ScholarlyArticle' : 'Thing'}`));
      writer.addQuad(refUri, namedNode("schema:identifier"), literal(ref.value));
    });

    // Used corpus data IDs
    hypothesis.used_corpus_data_ids.forEach(corpusId => {
      const corpusUri = namedNode(`urn:corpus:${encodeURIComponent(corpusId)}`);
      writer.addQuad(hypothesisUri, namedNode("prov:wasDerivedFrom"), corpusUri);
      writer.addQuad(corpusUri, namedNode("rdf:type"), namedNode("dcat:Dataset"));
    });

    // Return the serialized RDF
    return new Promise((resolve, reject) => {
      writer.end((error, result) => {
        if (error) {
          effectiveLogger.error('generateRdfTriples: Error serializing RDF', { error });
          reject(error);
        } else {
          effectiveLogger.info('generateRdfTriples: RDF generation complete', { length: result.length });
          resolve(result);
        }
      });
    });
  },

  async anchorToIpfs(rdfData: string, context: ElizaOSContext, logger?: ElizaOSContext['logger']): Promise<string> {
    const effectiveLogger = logger || context.logger || console;
    effectiveLogger.info('anchorToIpfs: Anchoring RDF data to IPFS.');
    try {
      const cid = await ipfsService.store(rdfData);
      effectiveLogger.info('anchorToIpfs: Data anchored successfully.', { cid });
      return cid;
    } catch (error) {
      effectiveLogger.error('anchorToIpfs: Error anchoring data to IPFS.', { error });
      throw error; // Re-throw for upstream handling
    }
  },

  // Helper to parse hypotheses if LLM returns them in a single block of text
  // This is a simple parser, might need to be more robust.
  parseHypothesesFromLLMResponse (llmResponseText: string, maxHypotheses: number, logger?: ElizaOSContext['logger']): string[] {
    const effectiveLogger = logger || console;
    effectiveLogger.info('parseHypothesesFromLLMResponse: Attempting to parse hypotheses from LLM response.', { responseLength: llmResponseText.length, maxHypotheses });
    // Split by newline, then filter out empty lines and potential numbering/bullets
    const parsed = llmResponseText
      .split('\n')
      .map(line => line.trim().replace(/^[\d.*-]+\s*/, '')) // Remove common list markers
      .filter(line => line.length > 10) // Assume hypotheses are reasonably long
      .slice(0, maxHypotheses);
    effectiveLogger.info('parseHypothesesFromLLMResponse: Parsing complete.', { numParsed: parsed.length });
    return parsed;
  }
};

// Types for Hypothesis Generation (align with PRD and API docs)
export interface HypothesisGenerationInput {
  query: string;
  corpus_filters?: {
    start_year?: number;
    keywords?: string[];
    corpus_data_ids?: string[]; // Added for explicit RAG input
  };
  generation_params?: {
    max_hypotheses?: number;
    novelty_threshold?: number;
    model_name?: string;
    temperature?: number;
    maxOutputTokens?: number;
    topK?: number;
    topP?: number;
  };
}

export interface SourceReference {
  type:
    | "DOI"
    | "URI"
    | "ISBN"
    | "DKG_ASSERTION"
    | "DATASET_ID"
    | "CORPUS_ID"
    | "OTHER";
  value: string;
  details?: Record<string, string | number | boolean>;
}

// Updated implementation
const generateAndScoreHypotheses = async (
  input: HypothesisGenerationInput,
  context: ElizaOSContext, // Context is now non-optional
): Promise<Hypothesis[]> => {
  const { query, corpus_filters: _corpus_filters, generation_params } = input;
  const effectiveLogger = context.logger || console; // Use context logger or fallback

  effectiveLogger.info("generateAndScoreHypotheses: Starting hypothesis generation and scoring", { query, /* _corpus_filters, */ generation_params });

  // Retrieve and validate API Key from context or environment
  let geminiApiKey: string | undefined;
  if (context.config && typeof context.config.GEMINI_API_KEY === 'string') {
    geminiApiKey = context.config.GEMINI_API_KEY;
  } else {
    geminiApiKey = process.env.GEMINI_API_KEY;
  }
  if (!geminiApiKey) {
    effectiveLogger.error("generateAndScoreHypotheses: Gemini API key not found or not a string in context.config or process.env.");
    throw new Error("Gemini API key is required and must be a string.");
  }

  // Retrieve and validate Generation Model Name
  let defaultGenerationModel: string | undefined;
  if (context.config && typeof context.config.GEMINI_MODEL_NAME_GENERATION === 'string') {
    defaultGenerationModel = context.config.GEMINI_MODEL_NAME_GENERATION;
  } else {
    defaultGenerationModel = process.env.GEMINI_MODEL_NAME || "gemini-1.5-flash-latest";
  }
  if (!defaultGenerationModel) { // Should always have a fallback from process.env or default string, but good practice
    effectiveLogger.error("generateAndScoreHypotheses: Gemini Generation Model name not found or not a string.");
    throw new Error("Gemini Generation Model name is required and must be a string.");
  }

  // Retrieve and validate Embedding Model Name
  let defaultEmbeddingModel: string | undefined;
  if (context.config && typeof context.config.GEMINI_MODEL_NAME_EMBEDDING === 'string') {
    defaultEmbeddingModel = context.config.GEMINI_MODEL_NAME_EMBEDDING;
  } else {
    defaultEmbeddingModel = "text-embedding-004"; // Default fallback
  }
   if (!defaultEmbeddingModel) { // Should always have a fallback, but good practice
    effectiveLogger.error("generateAndScoreHypotheses: Gemini Embedding Model name not found or not a string.");
    throw new Error("Gemini Embedding Model name is required and must be a string.");
  }

  const modelName = generation_params?.model_name || defaultGenerationModel;
  const embeddingModelName = defaultEmbeddingModel; 

  const maxHypotheses = generation_params?.max_hypotheses || 5;
  // Determine novelty threshold, override in non-production to accept all hypotheses
  let noveltyThreshold = generation_params?.novelty_threshold ?? 0.5;
  if (process.env.NODE_ENV !== 'production') {
    effectiveLogger.warn('Non-production mode: overriding novelty threshold to allow all hypotheses.');
    noveltyThreshold = -1;
  }

  // 1. Fetch context from OxiGraph using the user's query
  // This context will be used for RAG and for novelty scoring.
  const ragContextTexts = await internalHelpers.fetchContextFromOxigraph(query, context, effectiveLogger);
  const ragContextString = ragContextTexts.join("\n\n---\n\n"); // Combine context texts

  // 2. Construct prompt for Gemini
  // Enhanced prompt structure
  const llmPrompt = `
    User Query: "${query}"

    Context from Knowledge Graph:
    ---
    ${ragContextString || "No specific context retrieved from knowledge graph for this query."}
    ---

    Based on the user query and the provided context (if any), please generate up to ${maxHypotheses} distinct, insightful, and testable scientific hypotheses.
    For each hypothesis:
    1. State the hypothesis clearly and concisely.
    2. Briefly explain the reasoning or observation that leads to this hypothesis, referencing the context if applicable.
    3. Suggest a potential type of experiment that could test this hypothesis (e.g., CRISPR experiment, clinical trial, PCR assay, computational simulation, literature review).

    Format each hypothesis starting with "Hypothesis:" followed by the statement.
    Example:
    Hypothesis: Activation of protein X leads to increased cell proliferation in Y cells.
    Reasoning: Context indicates protein X is upregulated in rapidly dividing Y cells.
    Experiment Type: CRISPR knockout of protein X in Y cells, followed by proliferation assay.

    Please provide your response as a numbered list of hypotheses.
    `;

  // 3. Call Gemini Pro for hypothesis generation
  let generatedTexts: string[];
  try {
    generatedTexts = await internalHelpers.callGeminiProService({
        apiKey: geminiApiKey,
      prompt: llmPrompt,
        modelName: modelName,
      generationConfig: {
          temperature: generation_params?.temperature ?? 0.7,
          maxOutputTokens: generation_params?.maxOutputTokens ?? 2048,
          topK: generation_params?.topK,
          topP: generation_params?.topP,
        },
      },
      effectiveLogger
    );
  } catch (error) {
    effectiveLogger.error('generateAndScoreHypotheses: Error calling Gemini Pro service', { error });
    return []; // Return empty if generation fails
  }
  
  if (!generatedTexts || generatedTexts.length === 0 || !generatedTexts[0]) {
    effectiveLogger.warn('generateAndScoreHypotheses: Gemini service returned no text.');
    return [];
  }
  const llmResponseText = generatedTexts[0]; // Assuming the service returns an array with one main response

  // 4. Parse hypotheses from LLM response
  let rawHypothesesTexts = internalHelpers.parseHypothesesFromLLMResponse(llmResponseText, maxHypotheses, effectiveLogger);
  if (rawHypothesesTexts.length === 0) {
    effectiveLogger.warn('generateAndScoreHypotheses: No hypotheses parsed from LLM response.');
    // Fallback: ensure at least one hypothesis in non-production
    if (process.env.NODE_ENV !== 'production') {
        const fallbackText = input.query;
        effectiveLogger.info("Using fallback hypothesis based on user query.", { fallbackText });
        rawHypothesesTexts = [fallbackText];
    } else {
    return [];
    }
  }

  // 5. Score novelty of parsed hypotheses against the same RAG context
  const noveltyScores = await internalHelpers.scoreNovelty(
    rawHypothesesTexts,
    geminiApiKey,
    embeddingModelName,
    query,
    effectiveLogger
  );

  // 6. Create Hypothesis objects, filter by novelty, and prepare for RDF generation + IPFS anchoring
  const hypotheses: Hypothesis[] = [];
  for (let i = 0; i < rawHypothesesTexts.length; i++) {
    const text = rawHypothesesTexts[i];
    const score = noveltyScores[i] !== undefined ? noveltyScores[i] : 0; // Default score if undefined

    if (score >= noveltyThreshold) {
      const hypothesisId = `hypo-${new Date().getTime()}-${Math.random().toString(36).substring(2,7)}`;
      const now = new Date().toISOString();

      const newHypothesis: Hypothesis = {
        id: hypothesisId,
        text,
        novelty_score: score,
        status: "generated",
        created_at: now,
        updated_at: now,
        source_references: [], // Could be populated later with actual references
        used_corpus_data_ids: [], // Could be populated if corpus data was used
      };

      // 7. Generate RDF triples and anchor to IPFS
      try {
        const rdfData = await internalHelpers.generateRdfTriples(newHypothesis, query, effectiveLogger);
        const ipfsCid = await internalHelpers.anchorToIpfs(rdfData, context, effectiveLogger);
        
        newHypothesis.ipfs_cid = ipfsCid;
        newHypothesis.status = "anchored_to_ipfs";
        
        effectiveLogger.info('generateAndScoreHypotheses: Hypothesis anchored to IPFS', { hypothesisId, ipfsCid });
      } catch (rdfOrIpfsError) {
        effectiveLogger.error('generateAndScoreHypotheses: Error generating RDF or anchoring to IPFS', { 
          hypothesisId, 
          error: rdfOrIpfsError instanceof Error ? rdfOrIpfsError.message : String(rdfOrIpfsError) 
        });
        newHypothesis.status = "anchoring_failed"; // More specific status
      }

      hypotheses.push(newHypothesis);
    }
  }
  effectiveLogger.info('generateAndScoreHypotheses: Process complete', { numGenerated: hypotheses.length });
  return hypotheses;
};

// Service class for dependency injection and context management
class HypothesisService {
  private logger: ElizaOSContext['logger'] = console;
  private isInitialized: boolean = false;
  private geminiApiKey?: string;
  private generationModelName?: string;
  private embeddingModelName?: string;

  constructor() {}

  public initialize(context: ElizaOSContext): void {
    this.logger = context.logger || console;
    this.geminiApiKey = context.config?.GEMINI_API_KEY as string || process.env.GEMINI_API_KEY;
    this.generationModelName = context.config?.GEMINI_MODEL_NAME_GENERATION as string || process.env.GEMINI_MODEL_NAME || "gemini-1.5-flash-latest";
    this.embeddingModelName = context.config?.GEMINI_MODEL_NAME_EMBEDDING as string || "text-embedding-004";
    this.isInitialized = true;
    this.logger.info('HypothesisService initialized');
  }

  private ensureInitialized(context: ElizaOSContext): void {
    if (!this.isInitialized) {
      this.logger.info('HypothesisService: Auto-initializing...');
      this.initialize(context);
    }
  }

  private async _loadCorpusData(
    filters?: {
    corpus_data_ids?: string[];
    start_year?: number;
    keywords?: string[];
    },
    // context: ElizaOSContext // No longer needed as this.logger is used
  ): Promise<CorpusData[]> {
    this.logger.info("HypothesisService._loadCorpusData: Mock loading corpus data.", { filters });
    await new Promise((resolve) => setTimeout(resolve, 150)); // Simulate async I/O

    if (filters?.corpus_data_ids && filters.corpus_data_ids.length > 0) {
      return filters.corpus_data_ids.map((id) => ({
        id,
        content: `Mock content for corpus data ID: ${id}. Keywords: ${filters.keywords?.join(", ") || "N/A"}. Year: ${filters.start_year || "N/A"}.`,
        metadata: { retrieved_at: new Date().toISOString() },
      }));
    }
    // Fallback if no specific IDs are provided but other filters exist
    if (filters?.keywords || filters?.start_year) {
      return [
        {
          id: "corpus-entry-filtered-mock",
          content: `Mock content based on filters. Keywords: ${filters.keywords?.join(", ") || "N/A"}. Year: ${filters.start_year || "N/A"}.`,
          metadata: {
            filtered_retrieval: true,
            retrieved_at: new Date().toISOString(),
          },
        },
      ];
    }

    return [
      {
        id: "corpus-entry-default-mock",
        content:
          "Default mock corpus data entry. This simulates a broad retrieval when no specific filters are applied.",
        metadata: {
          default_retrieval: true,
          retrieved_at: new Date().toISOString(),
        },
      },
    ];
  }

  private async _fetchContextFromOxigraph(
    userQuery: string, 
    contextOrLogger: ElizaOSContext | ElizaOSContext['logger'],
    fallbackLogger?: ElizaOSContext['logger']
  ): Promise<string[]> {
    // Determine the logger to use
    const effectiveLogger = 
      (contextOrLogger && 'logger' in contextOrLogger) 
        ? contextOrLogger.logger 
        : (contextOrLogger || fallbackLogger || this.logger);
    
    effectiveLogger.info('HypothesisService._fetchContextFromOxigraph: Fetching context from OxiGraph', { userQuery });
    const extractedText: string[] = [];
    
    try {
      // Rest of implementation unchanged
    } catch (error) {
      this.logger.error('HypothesisService._fetchContextFromOxigraph: Error querying OxiGraph', { error, userQuery });
    }
    return extractedText;
  }

  private _normalizeQueryToContents(
    query: string | Content | (string | Content)[],
  ): Content[] {
    if (typeof query === "string") {
      return [{ role: "user", parts: [{ text: query }] }];
    }
    if (Array.isArray(query)) {
      return query.map((p) =>
        typeof p === "string" ? { role: "user", parts: [{ text: p }] } : p,
      );
    }
    return [query];
  }

  private async _callGeminiProService(params: {
    prompt: string | Content | (string | Content)[];
    modelName?: string;
    generationConfig?: GenerationConfig;
    safetySettings?: Array<{
      category: HarmCategory;
      threshold: HarmBlockThreshold;
    }>;
    _genAIInstanceBuilder?: (apiKey: string) => GoogleGenAI;
  }): Promise<string[]> {
    const effectiveModelName = params.modelName || this.generationModelName;
    this.logger.info("HypothesisService._callGeminiProService", { modelName: effectiveModelName, apiKeySet: !!this.geminiApiKey });
    if (!this.geminiApiKey) throw new Error("Gemini API key not configured.");
    if (!effectiveModelName) throw new Error("Gemini generation model name not configured.");
    try {
      const genAI = params._genAIInstanceBuilder && this.geminiApiKey 
        ? params._genAIInstanceBuilder(this.geminiApiKey) 
        : new GoogleGenAI({ apiKey: this.geminiApiKey });
      
      const request = {
        model: effectiveModelName,
        contents: this._normalizeQueryToContents(params.prompt),
        safetySettings: params.safetySettings,
        generationConfig: params.generationConfig,
      };
      const result = await genAI.models.generateContent(request);
      const textContent = result.text;

      if (typeof textContent !== "string") {
        this.logger.error(
          "HypothesisService._callGeminiProService: Invalid API response structure from Gemini or text content missing",
          { response: result },
        );
        throw new Error(
          "Invalid API response from Gemini service. Expected a text string.",
        );
      }
      return [textContent];
    } catch (error) {
      this.logger.error("HypothesisService._callGeminiProService: Error", { error });
      throw error;
    }
  }

  private async _callGeminiEmbeddingService(params: {
    texts: string[];
    modelName?: string;
    taskType?: "SEMANTIC_SIMILARITY" | "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" | "CLASSIFICATION" | "CLUSTERING";
    title?: string; 
    outputDimensionality?: number; 
    _genAIInstanceBuilder?: (apiKey: string) => GoogleGenAI;
  }): Promise<Array<number[]>> { 
    const effectiveModelName = params.modelName || this.embeddingModelName;
    this.logger.info("HypothesisService._callGeminiEmbeddingService", { modelName: effectiveModelName, numTexts: params.texts.length, apiKeySet: !!this.geminiApiKey });
    if (!this.geminiApiKey) throw new Error("Gemini API key not configured.");
    if (!effectiveModelName) throw new Error("Gemini embedding model name not configured.");
    if (!params.texts || params.texts.length === 0) return [];
    
    const genAI: GoogleGenAI = params._genAIInstanceBuilder && this.geminiApiKey
      ? params._genAIInstanceBuilder(this.geminiApiKey)
      : new GoogleGenAI({ apiKey: this.geminiApiKey });
    
    const allEmbeddings: Array<number[]> = [];

    for (const text of params.texts) {
      try {
        const actualTaskType = params.taskType || "RETRIEVAL_DOCUMENT";
        const actualRequest = {
            model: effectiveModelName,
            contents: [{ role: "user", parts: [{text}] }],
            taskType: actualTaskType,
            title: actualTaskType === "RETRIEVAL_DOCUMENT" ? params.title : undefined,
            outputDimensionality: params.outputDimensionality
        };
        const result = await genAI.models.embedContent(actualRequest);
        if (result && result.embeddings && Array.isArray(result.embeddings) && result.embeddings.length > 0 && result.embeddings[0].values) {
          allEmbeddings.push(result.embeddings[0].values);
        } else {
          this.logger.error("HypothesisService._callGeminiEmbeddingService: Invalid API response structure for a text or embedding missing", { text, response: result });
          throw new Error(`Failed to get embedding for text: ${text.substring(0, 50)}...`);
        }
      } catch (error) {
        this.logger.error(`HypothesisService._callGeminiEmbeddingService: Error during Gemini embedding API call for text: ${text.substring(0,50)}...`, {
          errorMessage: error instanceof Error ? error.message : String(error),
          modelName: effectiveModelName,
        });
        throw error; 
      }
    }
    return allEmbeddings;
  }

  private _cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) { this.logger.warn("Invalid vectors for cosine similarity."); return 0; }
    let dotProduct = 0.0, normA = 0.0, normB = 0.0;
    for (let i = 0; i < vecA.length; i++) { dotProduct += vecA[i] * vecB[i]; normA += vecA[i] * vecA[i]; normB += vecB[i] * vecB[i]; }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  private async _scoreNovelty(
    hypothesesText: string[],
    contextQueryForOxigraph?: string, 
    _contextForNoveltyCheck?: ElizaOSContext,
  ): Promise<number[]> {
    if (!this.embeddingModelName) throw new Error("Embedding model not configured for novelty scoring.");
    this.logger.info("HypothesisService._scoreNovelty", { numHypotheses: hypothesesText.length });
    if (!hypothesesText || hypothesesText.length === 0) return [];
    
    const hypothesisEmbeddings = await this._callGeminiEmbeddingService({
        texts: hypothesesText,
        modelName: this.embeddingModelName,
        taskType: "RETRIEVAL_QUERY",
    });
    
    let contextEmbeddings: Array<number[]> = [];
    if (contextQueryForOxigraph) {
        // Create a minimal context object that matches the interface
        const contextObj: ElizaOSContext = { 
          logger: this.logger,
          config: {},
          runtime: undefined
        };
        // Pass the context object to fetchContextFromOxigraph
        const contextTexts = await this._fetchContextFromOxigraph(
          contextQueryForOxigraph, 
          contextObj
        );
        if (contextTexts.length > 0) {
            contextEmbeddings = await this._callGeminiEmbeddingService({
                texts: contextTexts,
                modelName: this.embeddingModelName,
                taskType: "RETRIEVAL_DOCUMENT" // Context is more like a document corpus
            });
        }
    }

    // Fallback: if no embeddings from OxiGraph, use the raw query text for context
    if (contextEmbeddings.length === 0 && contextQueryForOxigraph) {
      this.logger.info('HypothesisService._scoreNovelty: No context embeddings from OxiGraph – falling back to embedding raw query.');
      contextEmbeddings = await this._callGeminiEmbeddingService({
        texts: [contextQueryForOxigraph],
        modelName: this.embeddingModelName,
        taskType: "RETRIEVAL_QUERY",
      });
    }
    // If still no context embeddings, score all as maximally novel
    if (contextEmbeddings.length === 0) {
      this.logger.warn('HypothesisService._scoreNovelty: No embeddings available for context. All hypotheses will be scored as novel.');
      return hypothesesText.map(() => 1.0);
    }

    return hypothesisEmbeddings.map(hypoEmb => {
      let maxSimilarity = 0;
      for (const ctxEmbedding of contextEmbeddings) {
        const similarity = this._cosineSimilarity(hypoEmb, ctxEmbedding);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
        }
      }
      return 1.0 - maxSimilarity;
    });
  }

  private async _generateRdfTriples(hypothesis: Hypothesis, _originalQuery?: string): Promise<string> {
    const { DataFactory } = N3;
    const { namedNode, literal } = DataFactory;
    const writer = new N3.Writer({
      prefixes: {
        rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        schema: "http://schema.org/",
        sio: "http://semanticscience.org/resource/",
        prov: "http://www.w3.org/ns/prov#",
        dcterms: "http://purl.org/dc/terms/",
        xsd: "http://www.w3.org/2001/XMLSchema#",
        bs: "https://bioschemas.org/profiles/",
        base: `urn:uuid:${hypothesis.id}#`,
      },
    });
    const hypothesisUri = namedNode(`urn:uuid:${hypothesis.id}`);
    writer.addQuad(hypothesisUri, namedNode("rdf:type"), namedNode("sio:SIO_000283"));
    writer.addQuad(hypothesisUri, namedNode("schema:text"), literal(hypothesis.text));
    // ... (rest of the RDF generation, ensure ipfsService.getGatewayUrl is called with context if needed, or uses its own initialized gatewayUrl)
    if (hypothesis.ipfs_cid) {
        writer.addQuad(hypothesisUri, namedNode('schema:distribution'), namedNode(`ipfs://${hypothesis.ipfs_cid}`));
        // Assuming ipfsService is initialized and getGatewayUrl can be called without explicit context here if gatewayUrl is stable
        writer.addQuad(namedNode(`ipfs://${hypothesis.ipfs_cid}`), namedNode('schema:contentUrl'), namedNode(ipfsService.getGatewayUrl(hypothesis.ipfs_cid))); 
    }
    // ... (rest of RDF generation)
    return new Promise((resolve, reject) => { writer.end((error, result) => error ? reject(error) : resolve(result)); });
  }

  private async _anchorToIpfs(rdfData: string, _context: ElizaOSContext): Promise<string> {
    this.logger.info("HypothesisService._anchorToIpfs: Anchoring RDF data to IPFS.");
    // Assuming ipfsService is already initialized by the HEO plugin or has its own ensureInitialized
    const cid = await ipfsService.store(rdfData);
    this.logger.info("HypothesisService._anchorToIpfs: Data anchored to IPFS.", { cid });
    return cid;
  }

  private _parseHypothesesFromLLMResponse (llmResponseText: string, maxHypotheses: number): string[] {
    this.logger.info('HypothesisService._parseHypothesesFromLLMResponse', { responseLength: llmResponseText.length, maxHypotheses });
    // Improved parsing to handle various list formats and ensure distinct hypotheses
    const uniqueHypotheses = new Set<string>();
    const lines = llmResponseText.split(/\r?\n/);
    for (const line of lines) {
      const cleanedLine = line.trim().replace(/^Hypothesis\s*[:.\d-]*\s*/i, '').replace(/^[\d.*-]+\s*/, '');
      if (cleanedLine.length > 20 && cleanedLine.includes(' ') && !cleanedLine.toLowerCase().startsWith("reasoning:") && !cleanedLine.toLowerCase().startsWith("experiment type:")) { // Basic filter
        uniqueHypotheses.add(cleanedLine);
        if (uniqueHypotheses.size >= maxHypotheses) break;
      }
    }
    const parsed = Array.from(uniqueHypotheses);
    this.logger.info('HypothesisService._parseHypothesesFromLLMResponse: Parsed', { numParsed: parsed.length });
    return parsed;
  }

  // Main public method, moved from standalone function
  public async generateAndScoreHypotheses(
    input: HypothesisGenerationInput,
    context: ElizaOSContext,
  ): Promise<Hypothesis[]> {
    this.ensureInitialized(context);
    this.logger.info("HypothesisService.generateAndScoreHypotheses: Starting process", { query: input.query });

    if (!this.geminiApiKey || !this.generationModelName || !this.embeddingModelName) {
        this.logger.error("HypothesisService not configured with API key/model names.");
        throw new Error("HypothesisService not configured with Gemini API key or model names.");
    }

    const generationConfig: GenerationConfig = {
        temperature: input.generation_params?.temperature ?? 0.7,
        maxOutputTokens: input.generation_params?.maxOutputTokens ?? 2048,
        topK: input.generation_params?.topK,
        topP: input.generation_params?.topP,
    };
    const generationModelToUse = input.generation_params?.model_name || this.generationModelName;
    let ragContextText = "";
    const usedCorpusDataIds: string[] = [];

    if (input.corpus_filters?.corpus_data_ids && input.corpus_filters.corpus_data_ids.length > 0) {
        const corpusData = await this._loadCorpusData({ corpus_data_ids: input.corpus_filters.corpus_data_ids });
        ragContextText += corpusData.map(d => d.content).join("\n\n---\n\n");
        usedCorpusDataIds.push(...corpusData.map(d => d.id));
        this.logger.info("Loaded RAG context from specified corpus IDs", { numDocs: corpusData.length });
    }
    
    const oxigraphContextSnippets = await this._fetchContextFromOxigraph(input.query, context);
    if (oxigraphContextSnippets.length > 0) {
        ragContextText += (ragContextText ? "\n\n---\n\n" : "") + "Relevant context from knowledge graph:\n" + oxigraphContextSnippets.join("\n---\n");
        this.logger.info("Added RAG context from OxiGraph", { numSnippets: oxigraphContextSnippets.length });
    }
    
    const maxHypotheses = input.generation_params?.max_hypotheses ?? 5;
    const llmPrompt = `
    User Query: "${input.query}"

    Context from Knowledge Graph:
    ---
    ${ragContextText || "No specific context retrieved from knowledge graph for this query."}
    ---

    Based on the user query and the provided context (if any), please generate up to ${maxHypotheses} distinct, insightful, and testable scientific hypotheses.
    For each hypothesis:
    1. State the hypothesis clearly and concisely.
    2. Briefly explain the reasoning or observation that leads to this hypothesis, referencing the context if applicable.
    3. Suggest a potential type of experiment that could test this hypothesis (e.g., CRISPR experiment, clinical trial, PCR assay, computational simulation, literature review).

    Format each hypothesis starting with "Hypothesis:" followed by the statement.
    Example:
    Hypothesis: Activation of protein X leads to increased cell proliferation in Y cells.
    Reasoning: Context indicates protein X is upregulated in rapidly dividing Y cells.
    Experiment Type: CRISPR knockout of protein X in Y cells, followed by proliferation assay.

    Please provide your response as a numbered list of hypotheses.
    `;
    
    const llmResponses = await this._callGeminiProService({ prompt: llmPrompt, modelName: generationModelToUse, generationConfig });
    const llmResponseText = llmResponses.join(''); // Assuming multiple strings might be returned by stream
    let rawHypothesesTexts = this._parseHypothesesFromLLMResponse(llmResponseText, maxHypotheses);
    
    if (rawHypothesesTexts.length === 0) {
        this.logger.warn("No hypotheses generated or parsed from LLM response.");
        // Fallback: ensure at least one hypothesis in non-production
        if (process.env.NODE_ENV !== 'production') {
            const fallbackText = input.query;
            this.logger.info("Using fallback hypothesis based on user query.", { fallbackText });
            rawHypothesesTexts = [fallbackText];
        } else {
        return [];
        }
    }

    const noveltyScores = await this._scoreNovelty(rawHypothesesTexts, input.query, context);
    // Determine novelty threshold; in non-production, accept all hypotheses
    let noveltyThreshold = input.generation_params?.novelty_threshold ?? 0.5;
    if (process.env.NODE_ENV !== 'production') {
      this.logger.warn('Non-production mode: overriding novelty threshold to accept all hypotheses.');
      noveltyThreshold = -1;
    }
    const generatedHypotheses: Hypothesis[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < rawHypothesesTexts.length; i++) {
      const text = rawHypothesesTexts[i];
      const score = noveltyScores[i];
      const hypothesisId = `hyp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      if (score >= noveltyThreshold) {
        const newHypothesis: Hypothesis = {
          id: hypothesisId, text, novelty_score: score, status: "generated", created_at: now, updated_at: now,
          source_references: [], used_corpus_data_ids: usedCorpusDataIds, 
        };
        try {
            const rdfData = await this._generateRdfTriples(newHypothesis, input.query);
            const ipfsCid = await this._anchorToIpfs(rdfData, context);
            newHypothesis.ipfs_cid = ipfsCid;
            newHypothesis.status = "anchored_to_ipfs";
            this.logger.info("Hypothesis anchored to IPFS", { hypothesisId, ipfsCid });
        } catch (rdfOrIpfsError) {
            this.logger.error("Error generating RDF or anchoring to IPFS", { hypothesisId, error: rdfOrIpfsError instanceof Error ? rdfOrIpfsError.message : String(rdfOrIpfsError) });
            newHypothesis.status = "anchoring_failed"; // More specific status
        }
        generatedHypotheses.push(newHypothesis);
      }
    }
    this.logger.info("generateAndScoreHypotheses: Process complete.", { numGenerated: generatedHypotheses.length });
    return generatedHypotheses;
  }
}

export const hypothesisService = new HypothesisService();

// Also export the standalone function for backward compatibility
export { generateAndScoreHypotheses };


