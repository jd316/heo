import fs from 'fs';
import path from 'path';
import jsonld from 'jsonld';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust this directory to where your JSON-LD files reside
const DATA_DIR = path.resolve(__dirname, '../sampleJsonLds');
const OXIGRAPH_ENDPOINT = process.env.OXIGRAPH_ENDPOINT_URL || 'http://localhost:7878/update';

async function loadJsonLd(filePath: string): Promise<void> {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const nquads = await jsonld.toRDF(data, { format: 'application/n-quads' });

  const sparql = `INSERT DATA { ${nquads} }`;
  const res = await fetch(OXIGRAPH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sparql-update' },
    body: sparql,
  });
  if (!res.ok) {
    throw new Error(`Failed to load ${filePath}: ${res.statusText}`);
  }
  console.log(`Loaded ${filePath}`);
}

async function main() {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.jsonld'));
  for (const file of files) {
    const fullPath = path.join(DATA_DIR, file);
    await loadJsonLd(fullPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 