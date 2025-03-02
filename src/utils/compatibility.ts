// src/utils/compatibility.ts
import { researchIntegration as actualResearchIntegration } from './research_integration.js';
import { exaResearch as actualExaResearch } from './exa_research.js';

// Define types for options and results
interface EnrichOptions {
  numResults?: number;
  timeRangeMonths?: number;
  includeNewsResults?: boolean;
  prioritizeRecent?: boolean;
  confidenceThreshold?: number;
  enhancedExtraction?: boolean;
  skipCache?: boolean;
  [key: string]: any;
}

interface EnrichResult {
  enrichedData: any[];
  researchInsights: string[];
  confidence: number;
  sources?: string[];
  cacheHit?: boolean;
  cacheTimestamp?: string;
  [key: string]: any;
}

interface AnalogiesOptions {
  enhancedExtraction?: boolean;
  maxAnalogiesPerDomain?: number;
  maxSolutionsPerAnalogy?: number;
  minConfidence?: number;
  skipCache?: boolean;
  [key: string]: any;
}

interface AnalogiesResult {
  analogies: string[];
  potentialSolutions: string[];
  confidenceScores?: Record<string, number>;
  sources?: string[];
  cacheHit?: boolean;
  [key: string]: any;
}

// Create compatibility wrappers that maintain the original interfaces
export const researchIntegration = {
  // Preserve original interface while using new implementation
  enrichAnalyticalContext: async (originalData: any[], context: string, options: EnrichOptions = {}) => {
    const newOptions: EnrichOptions = { ...options };
    if (newOptions.skipCache !== undefined) {
      delete newOptions.skipCache;
    }

    // Forward to new implementation but strip cache-specific properties from result
    const result = await actualResearchIntegration.enrichAnalyticalContext(
      originalData,
      context,
      newOptions
    );

    // Remove cache-specific fields from return value
    const cleanResult: EnrichResult = { ...result };
    if (cleanResult.cacheHit !== undefined) {
      delete cleanResult.cacheHit;
    }
    if (cleanResult.cacheTimestamp !== undefined) {
      delete cleanResult.cacheTimestamp;
    }

    return cleanResult;
  },

  findCrossdomainAnalogies: async (problem: string, domains: string[] = [], options: AnalogiesOptions = {}) => {
    const newOptions: AnalogiesOptions = { ...options };
    if (newOptions.skipCache !== undefined) {
      delete newOptions.skipCache;
    }

    const result = await actualResearchIntegration.findCrossdomainAnalogies(
      problem,
      domains,
      newOptions
    );

    // Remove cache-specific fields
    const cleanResult: AnalogiesResult = { ...result };
    if (cleanResult.cacheHit !== undefined) {
      delete cleanResult.cacheHit;
    }

    return cleanResult;
  },
};

// Similar wrapper for exaResearch if needed
export const exaResearch: typeof actualExaResearch = actualExaResearch;
