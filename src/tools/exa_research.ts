import { z } from 'zod';
import fetch from 'node-fetch';
import { Logger } from '../utils/logger.js';
import { nlpToolkit } from '../utils/nlp_toolkit.js';
import { 
  APIError, 
  ValidationError, 
  DataProcessingError, 
  ConfigurationError,
  AnalyticalError,
  withErrorHandling 
} from '../utils/errors.js';
import { executeApiRequest, RETRYABLE_STATUS_CODES } from '../utils/api_helpers.js';
import { config, isFeatureEnabled } from '../utils/config.js';
import * as mathjs from 'mathjs';

// Enhanced fact extraction interfaces
interface FactExtraction {
  text: string;
  facts: ExtractedFact[];
  confidence: number;
}

export interface ExtractedFact {
  fact: string;
  type: 'named_entity' | 'relationship' | 'statement' | 'sentiment';
  confidence: number;
  entities?: string[];
  publishedDate?: string;
  sentiment?: {
    score: number;
    comparative: number;
    positive: string[];
    negative: string[];
  };
}

export class EnhancedFactExtractor {
  // Advanced fact extraction with multiple techniques
  extractFacts(text: string, options: {
    maxFacts?: number;
    minConfidence?: number;
  } = {}): FactExtraction {
    const {
      maxFacts = 10,
      minConfidence = 0.5
    } = options;

    try {
      // Preliminary text cleaning
      const cleanedText = this.preprocessText(text);

      // Multiple extraction techniques
      const extractionTechniques = [
        this.extractNamedEntities(cleanedText),
        this.extractStatementFacts(cleanedText),
        this.extractRelationshipFacts(cleanedText),
        this.extractSentimentFacts(cleanedText)
      ];

      // Flatten and score facts
      const allFacts = extractionTechniques.flat()
        .filter(fact => fact.confidence >= minConfidence)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxFacts);

      // Compute overall extraction confidence
      const overallConfidence = this.computeExtractionConfidence(allFacts);

      return {
        text: cleanedText,
        facts: allFacts,
        confidence: overallConfidence
      };
    } catch (error) {
      Logger.error('Fact extraction failed', error);
      throw new DataProcessingError('Failed to extract facts', { 
        originalText: text,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Preprocess text to prepare for fact extraction
  private preprocessText(text: string): string {
    return text
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[^\w\s.,!?]/g, '')  // Remove special characters
      .trim()
      .toLowerCase();
  }

  // Named Entity Extraction using NLP Toolkit
  private extractNamedEntities(text: string): ExtractedFact[] {
    const entities = nlpToolkit.extractNamedEntities(text);
    
    return [
      ...entities.persons.map(person => ({
        fact: person,
        type: 'named_entity' as const,
        confidence: 0.8,
        entities: ['person']
      })),
      ...entities.organizations.map(org => ({
        fact: org,
        type: 'named_entity' as const,
        confidence: 0.7,
        entities: ['organization']
      })),
      ...entities.locations.map(location => ({
        fact: location,
        type: 'named_entity' as const,
        confidence: 0.7,
        entities: ['location']
      }))
    ];
  }

  // Statement Fact Extraction with NLP enhancements
  private extractStatementFacts(text: string): ExtractedFact[] {
    // Use tokenization to break text into meaningful statements
    const tokens = nlpToolkit.tokenize(text);
    const sentences = text.split(/[.!?]/)
      .filter(s => 
        s.trim().length > 30 &&  // Minimum meaningful length
        !s.includes('disclaimer') &&
        !s.includes('copyright')
      );

    return sentences.map(sentence => ({
      fact: sentence.trim(),
      type: 'statement' as const,
      confidence: this.computeSentenceConfidence(sentence),
      entities: []
    }));
  }

  // Relationship Fact Extraction with POS tagging
  private extractRelationshipFacts(text: string): ExtractedFact[] {
    const posTags = nlpToolkit.getPOSTags(text);
    
    // Find potential relationship patterns using POS tags
    const relationshipPatterns = [
      { pattern: ['NN', 'VBZ', 'NN'], type: 'simple_relation' },
      { pattern: ['NN', 'VBD', 'IN', 'NN'], type: 'complex_relation' }
    ];

    const facts: ExtractedFact[] = [];

    for (let i = 0; i < posTags.length - 2; i++) {
      relationshipPatterns.forEach(pattern => {
        if (
          posTags[i].tag === pattern.pattern[0] &&
          posTags[i+1].tag === pattern.pattern[1] &&
          posTags[i+2].tag === pattern.pattern[2]
        ) {
          facts.push({
            fact: `${posTags[i].word} ${posTags[i+1].word} ${posTags[i+2].word}`,
            type: 'relationship' as const,
            confidence: 0.6,
            entities: [posTags[i].word, posTags[i+2].word]
          });
        }
      });
    }

    return facts;
  }

  // Sentiment Fact Extraction
  private extractSentimentFacts(text: string): ExtractedFact[] {
    const sentimentAnalysis = nlpToolkit.analyzeSentiment(text);

    return [{
      fact: text,
      type: 'sentiment' as const,
      confidence: this.mapSentimentToConfidence(sentimentAnalysis.score),
      sentiment: {
        score: sentimentAnalysis.score,
        comparative: sentimentAnalysis.comparative,
        positive: sentimentAnalysis.positive,
        negative: sentimentAnalysis.negative
      }
    }];
  }

  // Compute confidence for a sentence
  private computeSentenceConfidence(sentence: string): number {
    // Multiple confidence factors
    const lemmas = nlpToolkit.tokenize(sentence)
      .map(token => nlpToolkit.lemmatize(token));
    
    const lengthFactor = Math.min(1, sentence.length / 100);
    const uniqueWordFactor = new Set(lemmas).size / lemmas.length;
    const spellCheckFactor = 1 - (nlpToolkit.spellCheck(sentence).length / lemmas.length);

    return mathjs.round(
      (lengthFactor + uniqueWordFactor + spellCheckFactor) / 3, 
      2
    );
  }

  // Map sentiment score to confidence
  private mapSentimentToConfidence(sentimentScore: number): number {
    // Convert sentiment score to confidence
    // Sentiment score typically ranges from -5 to 5
    return mathjs.round(
      Math.min(1, Math.max(0, (Math.abs(sentimentScore) / 5))), 
      2
    );
  }

  // Compute overall extraction confidence
  private computeExtractionConfidence(facts: ExtractedFact[]): number {
    if (facts.length === 0) return 0;

    const confidenceSum = facts.reduce((sum, fact) => sum + fact.confidence, 0);
    const averageConfidence = confidenceSum / facts.length;

    return mathjs.round(
      Math.min(1, averageConfidence * (1 + Math.log(facts.length))), 
      2
    );
  }
}

// Singleton instance
export const enhancedFactExtractor = new EnhancedFactExtractor();

// Exa research input schema
const ExaResearchSchema = z.object({
  query: z.string().describe('Search query for research'),
  numResults: z.number().min(1).max(10).default(5).describe('Number of search results'),
  timeRangeMonths: z
    .number()
    .min(1)
    .max(36)
    .optional()
    .describe('Time range for results in months'),
  useWebResults: z.boolean().default(true).describe('Include web search results'),
  useNewsResults: z.boolean().default(false).describe('Include news results'),
  includeContents: z.boolean().default(true).describe('Include full content of search results'),
  extractFacts: z.boolean().default(true).describe('Enable fact extraction from results')
});

// Exa search result interface
interface ExaSearchResult {
  title: string;
  url: string;
  publishedDate?: string;
  contents?: string;
  score?: number;
  facts?: ExtractedFact[];
}

// Enhanced research result interface
interface ExaResearchResult {
  query: string;
  results: ExaSearchResult[];
  summary: string;
  totalResults: number;
  processingTime: number;
  factExtractionStats?: {
    totalFacts: number;
    averageConfidence: number;
    factsByType: Record<string, number>;
  };
}

// Main exa research function (internal implementation)
async function exaResearchInternal(
  input: z.infer<typeof ExaResearchSchema>
): Promise<ExaResearchResult> {
  const params = ExaResearchSchema.parse(input);
  const startTime = Date.now();

  if (!isFeatureEnabled('exa_research')) {
    throw new ConfigurationError(
      'ERR_4003',
      'Exa research feature is not enabled',
      { feature: 'exa_research' },
      'exa_research'
    );
  }

  const apiKey = config.exa?.apiKey;
  if (!apiKey) {
    throw new ConfigurationError(
      'ERR_4001',
      'Exa API key is not configured',
      { configPath: 'exa.apiKey' },
      'exa_research'
    );
  }

  try {
    Logger.info(`[exa_research] Starting research query: "${params.query}"`);

    // Build search request
    const searchUrl = 'https://api.exa.ai/search';
    const searchPayload = {
      query: params.query,
      num_results: params.numResults,
      include_domains: params.useWebResults ? undefined : [],
      exclude_domains: params.useNewsResults ? [] : ['news.*'],
      start_published_date: params.timeRangeMonths 
        ? new Date(Date.now() - params.timeRangeMonths * 30 * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      contents: params.includeContents
    };

    // Execute API request with retry logic
    const response = await executeApiRequest(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchPayload)
    });

    if (!response.ok) {
      throw new APIError(
        'ERR_2005',
        `Exa API request failed: ${response.statusText}`,
        response.status,
        searchUrl,
        { query: params.query, payload: searchPayload },
        'exa_research'
      );
    }

    const searchResults = await response.json();
    
    if (!searchResults.results || !Array.isArray(searchResults.results)) {
      throw new DataProcessingError(
        'ERR_3004',
        'Invalid response format from Exa API',
        { response: searchResults },
        'exa_research'
      );
    }

    // Process results and extract facts if requested
    const processedResults: ExaSearchResult[] = [];
    let factExtractionStats: ExaResearchResult['factExtractionStats'];

    if (params.extractFacts) {
      const allFacts: ExtractedFact[] = [];
      const factsByType: Record<string, number> = {};

      for (const result of searchResults.results) {
        const processedResult: ExaSearchResult = {
          title: result.title || 'Untitled',
          url: result.url || '',
          publishedDate: result.published_date,
          contents: result.text,
          score: result.score
        };

        // Extract facts from content if available
        if (result.text && typeof result.text === 'string') {
          try {
            const factExtraction = enhancedFactExtractor.extractFacts(result.text, {
              maxFacts: 5,
              minConfidence: 0.6
            });
            
            processedResult.facts = factExtraction.facts;
            allFacts.push(...factExtraction.facts);

            // Count facts by type
            factExtraction.facts.forEach(fact => {
              factsByType[fact.type] = (factsByType[fact.type] || 0) + 1;
            });
          } catch (factError) {
            Logger.warn(`[exa_research] Fact extraction failed for result: ${result.title}`, factError);
            processedResult.facts = [];
          }
        }

        processedResults.push(processedResult);
      }

      // Calculate fact extraction statistics
      if (allFacts.length > 0) {
        const averageConfidence = allFacts.reduce((sum, fact) => sum + fact.confidence, 0) / allFacts.length;
        factExtractionStats = {
          totalFacts: allFacts.length,
          averageConfidence: mathjs.round(averageConfidence, 3),
          factsByType
        };
      }
    } else {
      // Process results without fact extraction
      processedResults.push(...searchResults.results.map((result: any) => ({
        title: result.title || 'Untitled',
        url: result.url || '',
        publishedDate: result.published_date,
        contents: result.text,
        score: result.score
      })));
    }

    // Generate summary
    const summary = generateResearchSummary(processedResults, params.query);
    const processingTime = Date.now() - startTime;

    Logger.info(`[exa_research] Research completed in ${processingTime}ms with ${processedResults.length} results`);

    return {
      query: params.query,
      results: processedResults,
      summary,
      totalResults: processedResults.length,
      processingTime,
      factExtractionStats
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    Logger.error(`[exa_research] Research failed after ${processingTime}ms`, error);

    if (error instanceof AnalyticalError) {
      throw error;
    }

    throw new DataProcessingError(
      'ERR_3004',
      `Research processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { query: params.query, error },
      'exa_research'
    );
  }
}

// Helper function to generate research summary
function generateResearchSummary(results: ExaSearchResult[], query: string): string {
  if (results.length === 0) {
    return `No results found for query: "${query}"`;
  }

  const topResults = results.slice(0, 3);
  const summaryParts = [
    `Research query "${query}" returned ${results.length} results.`,
    `Top sources include: ${topResults.map(r => r.title).join(', ')}.`
  ];

  // Add fact extraction summary if available
  const factsCount = results.reduce((sum, r) => sum + (r.facts?.length || 0), 0);
  if (factsCount > 0) {
    summaryParts.push(`Extracted ${factsCount} facts across all sources.`);
  }

  return summaryParts.join(' ');
}

// Export the main function with error handling wrapper
export const exaResearch = withErrorHandling('exa_research', exaResearchInternal);
