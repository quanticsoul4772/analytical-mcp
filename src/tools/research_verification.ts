import { z } from 'zod';
import { exaResearch } from './exa_research.js';
import { enhancedFactExtractor } from './exa_research.js';
import { Logger } from '../utils/logger.js';
import { APIError, ValidationError, DataProcessingError } from '../utils/errors.js';
import * as mathjs from 'mathjs';

// Research verification configuration schema
const ResearchVerificationSchema = z.object({
  query: z.string().describe('Primary research query'),
  verificationQueries: z.array(z.string()).optional().describe('Alternate queries for verification'),
  minConsistencyThreshold: z.number().min(0).max(1).default(0.7).describe('Minimum consistency score'),
  sources: z.number().min(1).max(10).default(3).describe('Number of sources to cross-verify'),
  factExtractionOptions: z.object({
    maxFacts: z.number().min(1).max(20).optional().default(10),
    minConfidence: z.number().min(0).max(1).optional().default(0.5)
  }).optional().default({})
});

// Confidence scoring interface
interface ResearchConfidence {
  score: number;
  details: {
    sourceConsistency: number;
    sourceCount: number;
    uniqueSources: string[];
    conflictingClaims: string[];
    factExtractions: Array<{
      source: string;
      facts: Array<{
        fact: string;
        type: string;
        confidence: number;
      }>;
      sourceConfidence: number;
    }>;
  };
}

export class ResearchVerificationTool {
  // Cross-source verification method with enhanced fact extraction
  async verifyResearch(
    input: z.infer<typeof ResearchVerificationSchema>
  ): Promise<{
    verifiedResults: string[];
    confidence: ResearchConfidence;
  }> {
    try {
      const params = ResearchVerificationSchema.parse(input);
      
      // Prepare for fact extraction and verification
      const factExtractions: ResearchConfidence['details']['factExtractions'] = [];
      const allExtractedFacts: string[] = [];
      const uniqueSources = new Set<string>();
      const conflictingClaims: string[] = [];

      // Primary query search
      const primaryResults = await exaResearch.search({
        query: params.query,
        numResults: params.sources,
        includeContents: true
      });

      // Extract and analyze facts from primary search
      for (const result of primaryResults.results) {
        const sourceTitle = result.title || 'Unknown Source';
        uniqueSources.add(sourceTitle);

        // Use enhanced fact extractor
        const extraction = enhancedFactExtractor.extractFacts(
          result.contents || '', 
          params.factExtractionOptions
        );

        // Add to fact extractions
        factExtractions.push({
          source: sourceTitle,
          facts: extraction.facts.map(f => ({
            fact: f.fact,
            type: f.type,
            confidence: f.confidence
          })),
          sourceConfidence: extraction.confidence
        });

        // Collect facts
        allExtractedFacts.push(...extraction.facts.map(f => f.fact));
      }

      // Verification queries processing
      if (params.verificationQueries) {
        for (const verificationQuery of params.verificationQueries) {
          const verificationSearch = await exaResearch.search({
            query: verificationQuery,
            numResults: params.sources,
            includeContents: true
          });

          for (const result of verificationSearch.results) {
            const sourceTitle = result.title || 'Verification Source';
            uniqueSources.add(sourceTitle);

            const extraction = enhancedFactExtractor.extractFacts(
              result.contents || '', 
              params.factExtractionOptions
            );

            factExtractions.push({
              source: sourceTitle,
              facts: extraction.facts.map(f => ({
                fact: f.fact,
                type: f.type,
                confidence: f.confidence
              })),
              sourceConfidence: extraction.confidence
            });

            // Add verification facts
            allExtractedFacts.push(...extraction.facts.map(f => f.fact));
          }
        }
      }

      // Compute consistency and confidence
      const confidence = this.computeConfidence(
        allExtractedFacts, 
        factExtractions, 
        params.minConsistencyThreshold
      );

      // Log verification details
      Logger.debug('Research Verification Results', {
        primaryQuery: params.query,
        confidenceScore: confidence.score,
        sourceCount: confidence.details.sourceCount
      });

      return {
        verifiedResults: allExtractedFacts,
        confidence
      };
    } catch (error) {
      Logger.error('Research verification failed', error);
      
      if (error instanceof z.ZodError) {
        throw new ValidationError(`Invalid research verification input: ${error.message}`, {
          issues: error.issues
        });
      }

      throw new DataProcessingError(`Research verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        originalInput: input
      });
    }
  }

  // Compute confidence score based on research consistency
  private computeConfidence(
    facts: string[], 
    factExtractions: ResearchConfidence['details']['factExtractions'], 
    minThreshold: number
  ): ResearchConfidence {
    // Compute fact similarity and consistency
    const factConsistencyMatrix = this.computeFactConsistency(facts);

    // Calculate source-level confidences
    const sourceConfidences = factExtractions.map(extraction => 
      mathjs.mean(extraction.facts.map(f => f.confidence))
    );

    // Overall source confidence
    const averageSourceConfidence = mathjs.mean(sourceConfidences);

    // Compute consistency score
    const consistencyScore = mathjs.mean(
      factConsistencyMatrix.map(row => mathjs.mean(row))
    );

    // Final confidence computation
    const confidenceScore = mathjs.round(
      Math.min(1, 
        consistencyScore * 
        averageSourceConfidence * 
        (1 + Math.log(factExtractions.length))
      ), 
      2
    );

    return {
      score: Math.max(confidenceScore, minThreshold),
      details: {
        sourceConsistency: consistencyScore,
        sourceCount: factExtractions.length,
        uniqueSources: Array.from(new Set(factExtractions.map(e => e.source))),
        conflictingClaims: [], // TODO: Implement more sophisticated conflict detection
        factExtractions: factExtractions
      }
    };
  }

  // Compute similarity matrix between extracted facts
  private computeFactConsistency(facts: string[]): number[][] {
    // Simple Jaccard similarity for fact comparison
    const computeSimilarity = (fact1: string, fact2: string): number => {
      const set1 = new Set(fact1.toLowerCase().split(/\s+/));
      const set2 = new Set(fact2.toLowerCase().split(/\s+/));

      const intersection = new Set([...set1].filter(x => set2.has(x)));
      const union = new Set([...set1, ...set2]);

      return intersection.size / union.size;
    };

    // Create similarity matrix
    const similarityMatrix: number[][] = [];
    for (let i = 0; i < facts.length; i++) {
      similarityMatrix[i] = [];
      for (let j = 0; j < facts.length; j++) {
        similarityMatrix[i][j] = i === j ? 1 : computeSimilarity(facts[i], facts[j]);
      }
    }

    return similarityMatrix;
  }

  // MCP Server tool registration
  registerTool(server: any): void {
    Logger.info('Research Verification tool registered');
    
    // TODO: Implement specific registration logic if needed
  }
}

// Singleton instance
export const researchVerification = new ResearchVerificationTool();
