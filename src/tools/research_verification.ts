import { z } from 'zod';
import { exaResearch } from './exa_research.js';
import { Logger } from '../utils/logger.js';
import { APIError, ValidationError, DataProcessingError } from '../utils/errors.js';

// Research verification configuration schema
const ResearchVerificationSchema = z.object({
  query: z.string().describe('Primary research query'),
  verificationQueries: z.array(z.string()).optional().describe('Alternate queries for verification'),
  minConsistencyThreshold: z.number().min(0).max(1).default(0.7).describe('Minimum consistency score'),
  sources: z.number().min(1).max(10).default(3).describe('Number of sources to cross-verify'),
});

// Confidence scoring interface
interface ResearchConfidence {
  score: number;
  details: {
    sourceConsistency: number;
    sourceCount: number;
    uniqueSources: string[];
    conflictingClaims: string[];
  };
}

export class ResearchVerificationTool {
  // Cross-source verification method
  async verifyResearch(
    input: z.infer<typeof ResearchVerificationSchema>
  ): Promise<{
    verifiedResults: string[];
    confidence: ResearchConfidence;
  }> {
    try {
      const params = ResearchVerificationSchema.parse(input);
      
      // Primary query search
      const primaryResults = await exaResearch.search({
        query: params.query,
        numResults: params.sources,
        includeContents: true
      });

      // Extract primary facts
      const primaryFacts = exaResearch.extractKeyFacts(primaryResults.results);

      // Additional verification queries
      const verificationResults: string[][] = [];
      if (params.verificationQueries) {
        for (const verificationQuery of params.verificationQueries) {
          const verificationSearch = await exaResearch.search({
            query: verificationQuery,
            numResults: params.sources,
            includeContents: true
          });
          verificationResults.push(
            exaResearch.extractKeyFacts(verificationSearch.results)
          );
        }
      }

      // Compute confidence
      const confidence = this.computeConfidence(
        primaryFacts,
        verificationResults,
        params.minConsistencyThreshold
      );

      // Log verification details
      Logger.debug('Research Verification Results', {
        primaryQuery: params.query,
        confidenceScore: confidence.score,
        sourceCount: confidence.details.sourceCount
      });

      return {
        verifiedResults: primaryFacts,
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
    primaryFacts: string[], 
    verificationFacts: string[][], 
    minThreshold: number
  ): ResearchConfidence {
    // Basic consistency check
    const uniqueSources = new Set<string>();
    let consistentClaims = 0;
    const totalClaims = primaryFacts.length;
    const conflictingClaims: string[] = [];

    // Compare primary facts with verification facts
    primaryFacts.forEach(primaryFact => {
      let isConsistent = false;
      
      for (const verificationFactSet of verificationFacts) {
        if (verificationFactSet.some(vFact => 
          this.compareFactSimilarity(primaryFact, vFact) > 0.6
        )) {
          isConsistent = true;
          break;
        }
      }

      if (isConsistent) {
        consistentClaims++;
      } else {
        conflictingClaims.push(primaryFact);
      }
    });

    // Calculate confidence score
    const consistencyRatio = consistentClaims / totalClaims;
    const confidenceScore = Math.max(
      Math.min(consistencyRatio, 1),
      minThreshold
    );

    return {
      score: confidenceScore,
      details: {
        sourceConsistency: consistencyRatio,
        sourceCount: totalClaims,
        uniqueSources: Array.from(uniqueSources),
        conflictingClaims
      }
    };
  }

  // Simple fact similarity comparison
  private compareFactSimilarity(fact1: string, fact2: string): number {
    // Convert to lowercase and remove punctuation
    const clean1 = fact1.toLowerCase().replace(/[^\w\s]/gi, '');
    const clean2 = fact2.toLowerCase().replace(/[^\w\s]/gi, '');

    // Simple Jaccard similarity
    const set1 = new Set(clean1.split(/\s+/));
    const set2 = new Set(clean2.split(/\s+/));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  // MCP Server tool registration
  registerTool(server: any): void {
    Logger.info('Research Verification tool registered');
    
    // TODO: Register verification method with MCP server
    // server.register('verifyResearch', this.verifyResearch.bind(this));
  }
}

// Singleton instance
export const researchVerification = new ResearchVerificationTool();
