import { logger } from '../utils/logger';
import type { ElizaOSContext } from '../elizaos/types';

const PUBMED_API_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const PUBMED_API_KEY = process.env.PUBMED_API_KEY; // Optional, but recommended for higher rate limits

export interface WebSearchInput {
  query: string;
  max_results?: number;
  source_preference?: Array<'PubMed' | 'PubMedCentral' | 'General'>;
}

export interface SearchResultItem {
  title: string;
  link: string;
  snippet: string;
  source: string;
  pmid?: string;
  pmcid?: string;
}

export interface WebSearchOutput {
  results: SearchResultItem[];
  error?: string;
}

class WebSearchService {
  constructor() {
    if (!PUBMED_API_KEY) {
      logger.warn('PUBMED_API_KEY is not set. NCBI E-utilities rate limits will be lower.');
    }
  }

  async searchPubMed(query: string, max_results = 10): Promise<SearchResultItem[]> {
    const searchUrl = new URL(`${PUBMED_API_BASE_URL}/esearch.fcgi`);
    searchUrl.searchParams.append('db', 'pubmed');
    searchUrl.searchParams.append('term', query);
    searchUrl.searchParams.append('retmax', String(max_results));
    searchUrl.searchParams.append('retmode', 'json');
    if (PUBMED_API_KEY) {
      searchUrl.searchParams.append('api_key', PUBMED_API_KEY);
    }

    try {
      const searchResponse = await fetch(searchUrl.toString());
      if (!searchResponse.ok) {
        throw new Error(`PubMed API error (esearch): ${searchResponse.status} ${await searchResponse.text()}`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const searchData = await searchResponse.json() as any;

      if (!searchData.esearchresult || !searchData.esearchresult.idlist || searchData.esearchresult.idlist.length === 0) {
        return [];
      }

      const ids = searchData.esearchresult.idlist.join(',');

      const summaryUrl = new URL(`${PUBMED_API_BASE_URL}/esummary.fcgi`);
      summaryUrl.searchParams.append('db', 'pubmed');
      summaryUrl.searchParams.append('id', ids);
      summaryUrl.searchParams.append('retmode', 'json');
      if (PUBMED_API_KEY) {
        summaryUrl.searchParams.append('api_key', PUBMED_API_KEY);
      }
      
      const summaryResponse = await fetch(summaryUrl.toString());
      if (!summaryResponse.ok) {
        throw new Error(`PubMed API error (esummary): ${summaryResponse.status} ${await summaryResponse.text()}`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const summaryData = await summaryResponse.json() as any;
      
      const results: SearchResultItem[] = [];
      if (summaryData.result) {
        for (const id of searchData.esearchresult.idlist) {
          const article = summaryData.result[id];
          if (article) {
            results.push({
              title: article.title || 'N/A',
              link: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
              snippet: article.abstract || article.title || 'No abstract available.',
              source: 'PubMed',
              pmid: id,
            });
          }
        }
      }
      return results;

    } catch (error) {
      logger.error('Error searching PubMed:', error);
      throw error;
    }
  }

  public async execute(input: WebSearchInput, _context?: ElizaOSContext): Promise<WebSearchOutput> {
    logger.info('WebSearchService executing...', { query: input.query });
    try {
      const preferPubMed = !input.source_preference || input.source_preference.includes('PubMed') || input.source_preference.includes('PubMedCentral');
      let searchResults: SearchResultItem[] = [];

      if (preferPubMed) {
        searchResults = await this.searchPubMed(input.query, input.max_results);
      }
      
      return { results: searchResults };
    } catch (error) {
      logger.error('WebSearchService execution failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during web search';
      return { results: [], error: errorMessage };
    }
  }
}

export const webSearchService = new WebSearchService(); 