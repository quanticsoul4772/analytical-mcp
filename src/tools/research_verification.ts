import { z } from 'zod';
import { exaResearch } from '../utils/exa_research.js';
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
        includeContents: true,
        useWebResults: true,
        useNewsResults: false
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
            includeContents: true,
            useWebResults: true,
            useNewsResults: false
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
        throw new ValidationError(
          'ERR_1001',
          `Invalid research verification input: ${error.message}`,
          { issues: error.issues }
        );
      }

      throw new DataProcessingError(
        'ERR_3001',
        `Research verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalInput: input }
      );
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

    // Detect conflicting claims
    const conflictDetails = this.detectConflictingClaims(factExtractions);

    // Convert conflict details to string format for compatibility
    const conflictingClaims = conflictDetails.map(conflict =>
      `"${conflict.claim1}" (${conflict.source1}) vs "${conflict.claim2}" (${conflict.source2}): ${conflict.conflictReason}`
    );

    return {
      score: Math.max(confidenceScore, minThreshold),
      details: {
        sourceConsistency: consistencyScore,
        sourceCount: factExtractions.length,
        uniqueSources: Array.from(new Set(factExtractions.map(e => e.source))),
        conflictingClaims,
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

  /**
   * Detect conflicting claims across fact extractions
   * Identifies facts that contradict each other based on negation patterns and low similarity
   */
  private detectConflictingClaims(factExtractions: Array<{
    source: string;
    facts: Array<{ fact: string; type: string; confidence: number }>;
    sourceConfidence: number;
  }>): Array<{
    claim1: string;
    claim2: string;
    source1: string;
    source2: string;
    conflictReason: string;
  }> {
    const conflicts: Array<{
      claim1: string;
      claim2: string;
      source1: string;
      source2: string;
      conflictReason: string;
    }> = [];

    // Common negation patterns that indicate potential conflicts
    const negationPatterns = [
      { pattern: /\b(not|never|no|none|cannot|can't|won't|wouldn't|shouldn't|isn't|aren't|wasn't|weren't)\b/i, weight: 1.0 },
      { pattern: /\b(false|incorrect|wrong|untrue|inaccurate|deny|denies|denied)\b/i, weight: 0.8 },
      { pattern: /\b(opposite|contrary|contradicts|contradicted|disputes|disputed)\b/i, weight: 0.9 },
    ];

    // Antonym pairs that suggest conflicts
    const antonymPairs = [
      ['increase', 'decrease'], ['rise', 'fall'], ['more', 'less'],
      ['higher', 'lower'], ['greater', 'smaller'], ['positive', 'negative'],
      ['success', 'failure'], ['growth', 'decline'], ['improve', 'worsen'],
      ['before', 'after'], ['true', 'false'], ['yes', 'no']
    ];

    // Compare facts across different sources
    for (let i = 0; i < factExtractions.length; i++) {
      for (let j = i + 1; j < factExtractions.length; j++) {
        const source1Facts = factExtractions[i].facts;
        const source2Facts = factExtractions[j].facts;
        const source1 = factExtractions[i].source;
        const source2 = factExtractions[j].source;

        // Compare each fact from source1 with facts from source2
        for (const factObj1 of source1Facts) {
          for (const factObj2 of source2Facts) {
            const fact1 = factObj1.fact;
            const fact2 = factObj2.fact;
            // Skip if facts are too similar (likely saying the same thing)
            const similarity = this.computeTextSimilarity(fact1, fact2);
            if (similarity > 0.7) continue;

            // Check for negation patterns
            const fact1Lower = fact1.toLowerCase();
            const fact2Lower = fact2.toLowerCase();
            let hasNegation = false;
            let negationScore = 0;

            for (const { pattern, weight } of negationPatterns) {
              const fact1HasNegation = pattern.test(fact1);
              const fact2HasNegation = pattern.test(fact2);

              if (fact1HasNegation !== fact2HasNegation) {
                hasNegation = true;
                negationScore = Math.max(negationScore, weight);
              }
            }

            // Check for antonym pairs
            let hasAntonyms = false;
            for (const [word1, word2] of antonymPairs) {
              const hasAntonymConflict =
                (fact1Lower.includes(word1) && fact2Lower.includes(word2)) ||
                (fact1Lower.includes(word2) && fact2Lower.includes(word1));

              if (hasAntonymConflict) {
                hasAntonyms = true;
                break;
              }
            }

            // Check if facts share common entities/subjects but differ in claims
            const sharedWords = this.getSharedSignificantWords(fact1, fact2);
            const hasSharedContext = sharedWords.length >= 2;

            // Determine if this is a conflict
            if (hasSharedContext && (hasNegation || hasAntonyms)) {
              const reason = hasNegation
                ? `Negation detected (confidence: ${(negationScore * 100).toFixed(0)}%)`
                : 'Contradictory terms detected';

              conflicts.push({
                claim1: fact1,
                claim2: fact2,
                source1,
                source2,
                conflictReason: reason
              });
            }
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Compute text similarity using Jaccard index
   */
  private computeTextSimilarity(text1: string, text2: string): number {
    const set1 = new Set(text1.toLowerCase().split(/\s+/));
    const set2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Get shared significant words between two texts
   * Filters out common stop words
   */
  private getSharedSignificantWords(text1: string, text2: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
      'we', 'they', 'them', 'their', 'what', 'which', 'who', 'when', 'where',
      'why', 'how'
    ]);

    const words1 = text1.toLowerCase().split(/\s+/).filter(w =>
      w.length > 2 && !stopWords.has(w)
    );
    const words2 = text2.toLowerCase().split(/\s+/).filter(w =>
      w.length > 2 && !stopWords.has(w)
    );

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    return [...set1].filter(w => set2.has(w));
  }

  // MCP Server tool registration
  registerTool(server: any): void {
    Logger.info('Research Verification tool registered');
    // Registration is handled in tools/index.ts
  }
}

// Singleton instance
export const researchVerification = new ResearchVerificationTool();
