# HEO — Hypothesis-to-Experiment Orchestrator

Automate AI-driven scientific research workflows with an ElizaOS plugin that handles:

- Hypothesis generation (Google Gemini + OxiGraph RAG)
- Cloud-Lab protocol execution (Strateos/ECL)
- zkSNARK proof generation & on-chain anchoring (Solana)
- FAIR JSON-LD packaging & IPFS storage

---

## Quickstart

### Prerequisites

- Node.js v18+ and pnpm (or npm)
- Circom/ZK-circuit artifacts built under `circuits/`
- A valid Solana keypair at `SOLANA_KEYPAIR_PATH`

### Setup

1. Clone the repository:

```bash
   git clone https://github.com/jd316/heo.git
   cd heo
   ```

2. Install dependencies:

```bash
npm install
   ```

3. Configure environment variables:

```bash
   cp .env.example .env
   # Edit .env and fill in API keys, endpoints, and paths
```

### Local Dependencies

Ensure IPFS and Oxigraph services are running locally (or configure remote endpoints in `.env`):

```bash
ipfs daemon
oxigraph-server run --memory
```

### Pre-Run

Seed sample JSON-LD into OxiGraph and compile zkSNARK circuits:

```bash
npm run seed:jsonld
npm run compile:circuit
```

4. Start the development server:

```bash
   npm run dev
   ```

5. Open your browser at [http://localhost:3000](http://localhost:3000) to explore the demo.

---

## Environment Variables

See `.env.example` for all required variables.

---

## API Endpoints

All endpoints are under the Next.js App Router (server routes):

- **POST** `/api/heo/generate` — Generate and score hypotheses via Google Gemini + OxiGraph RAG

### DKG Endpoints

- **GET**  `/api/dkg/node-info` — Retrieve DKG node metadata (version, etc.)
- **GET**  `/api/dkg/asset/get/[UAL]?contentType=all|public|private` — Fetch a Knowledge Asset by UAL, with optional content type filter
- **GET**  `/api/dkg/allowance` — Get current token allowance for DKG contract
- **POST** `/api/dkg/query` — Execute a SPARQL SELECT query against the OriginTrail DKG (body: `{ sparql }`)
- **POST** `/api/dkg/asset/create` — Create a new Knowledge Asset (body: `{ content, options }`)
- **POST** `/api/dkg/bid-suggestion` — Calculate suggested bid for publishing (body: `{ content, options }`)
- **POST** `/api/dkg/format-graph` — Format JSON-LD content into public/private assertion (body: `{ content }`)
- **POST** `/api/dkg/triples-number` — Get number of RDF triples for content (body: `{ content }`)
- **POST** `/api/dkg/chunks-number` — Get number of data chunks for content (body: `{ content }`)
- **POST** `/api/dkg/allowance/increase` — Increase token allowance (body: `{ amount }`)
- **POST** `/api/dkg/allowance/decrease` — Decrease token allowance (body: `{ amount }`)
- **POST** `/api/dkg/allowance/set` — Set token allowance to a specific amount (body: `{ amount }`)

- **POST** `/api/validation` — Validate experiment results with zkSNARK proof generation & Solana anchoring
- **POST** `/api/publish/fair` — Assemble and store FAIR JSON-LD package on IPFS
- **POST** `/api/lab/run` — Submit a protocol payload for cloud-lab execution (Strateos/ECL)
- **GET**  `/api/lab/run/[runId]` — Poll the status of a cloud-lab run
- **GET**  `/api/lab/run/[runId]/results` — Fetch execution results from a cloud-lab run
- **GET**  `/api/protocol/templates` — List all available protocol templates
- **GET**  `/api/protocol/templates/[id]` — Get details for a specific protocol template
- **POST** `/api/protocol/execute` — Initialize a protocol instance on Solana blockchain

---

## Project Structure

```
src/
├── app/              # Next.js pages and React demo components
├── elizaos/          # ElizaOS plugin types & adapter code
├── services/         # Core service implementations (hypothesis, lab, zkSNARK, IPFS, Solana)
├── circuits/         # zkSNARK circuit WASM, zkey, and verification key
└── utils/            # Shared utilities (logging, error handling)
```

---

## Running Tests & Lint

```bash
npm run lint    # ESLint
npm test        # Jest tests
npm run test:cov # Jest coverage report
npm run test:e2e # Playwright end-to-end tests
npm build       # Next.js production build
```
