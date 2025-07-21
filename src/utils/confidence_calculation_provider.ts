/**
 * Confidence Calculation Provider
 * 
 * Handles confidence scoring for research integration results.
 * Provides focused confidence calculation logic with validation patterns.
 */

import { Logger } from './logger.js';
import { ValidationHelpers } from './validation_helpers.js';
import type { ExtractedFact } from './advanced_fact_extraction.js';

/**
 * Confidence Calculation Provider
 * Manages confidence scoring for research results
 */
export class ConfidenceCalculationProvider {

  /**
   * Calculate confidence for enrichment results
   */
  calculateEnrichmentConfidence(insights: string[], sources: string[]): number {
    // Early validation using ValidationHelpers
    if (!Array.isArray(insights)) {
      Logger.warn('Invalid insights array provided for confidence calculation');
      return 0.5;
    }
    
    if (!Array.isArray(sources)) {
      Logger.warn('Invalid sources array provided for confidence calculation');
      return 0.5;
    }

    const baseConfidence = insights.length > 0 
      ? Math.min(0.9, 0.5 + insights.length * 0.1) 
      : 0.5;

    const uniqueSourceBoost = Math.min(0.2, sources.length * 0.05);
    const finalConfidence = Math.min(0.95, baseConfidence + uniqueSourceBoost);
    
    Logger.debug('Calculated enrichment confidence', {
      insightsCount: insights.length,
      sourcesCount: sources.length,
      baseConfidence,
      uniqueSourceBoost,
      finalConfidence
    });

    return finalConfidence;
  }

  /**
   * Calculate confidence for cross-domain analogies
   */
  calculateAnalogyConfidence(analogies: string[], domains: string[], failedDomains: string[]): number {
    if (!Array.isArray(analogies) || !Array.isArray(domains)) {
      Logger.warn('Invalid analogies or domains array provided for confidence calculation');
      return 0.3;
    }

    const successRate = domains.length > 0 
      ? (domains.length - failedDomains.length) / domains.length 
      : 0;
    
    const analogyQualityScore = analogies.length > 0 
      ? Math.min(0.8, 0.4 + analogies.length * 0.1) 
      : 0.3;
    
    const finalConfidence = Math.min(0.9, successRate * 0.5 + analogyQualityScore * 0.5);
    
    Logger.debug('Calculated analogy confidence', {
      analogiesCount: analogies.length,
      domainsCount: domains.length,
      failedCount: failedDomains.length,
      successRate,
      analogyQualityScore,
      finalConfidence
    });

    return finalConfidence;
  }

  /**
   * Calculate fact quality score for prioritization
   */
  calculateFactQualityScore(fact: ExtractedFact): number {
    if (!fact) {
      return 0;
    }

    let qualityScore = 0.5; // Base score

    // Confidence boost (if available)
    if ((fact as any).confidence && (fact as any).confidence > 0.7) {
      qualityScore += 0.2;
    }

    // Relevance boost (if available)
    if ((fact as any).relevance && (fact as any).relevance > 0.8) {
      qualityScore += 0.2;
    }

    // Source quality (if available)
    if (fact.source && fact.source.includes('research') || fact.source.includes('academic')) {
      qualityScore += 0.1;
    }

    return Math.min(0.95, qualityScore);
  }

  /**
   * Calculate weighted confidence across multiple factors
   */
  calculateWeightedConfidence(factors: Array<{ value: number; weight: number }>): number {
    if (!Array.isArray(factors) || factors.length === 0) {
      return 0.5;
    }

    let totalWeight = 0;
    let weightedSum = 0;

    for (const factor of factors) {
      if (typeof factor.value === 'number' && typeof factor.weight === 'number') {
        weightedSum += factor.value * factor.weight;
        totalWeight += factor.weight;
      }
    }

    const finalConfidence = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
    
    Logger.debug('Calculated weighted confidence', {
      factorsCount: factors.length,
      totalWeight,
      weightedSum,
      finalConfidence
    });

    return Math.min(0.95, Math.max(0.05, finalConfidence));
  }

  /**
   * Validate confidence score is within acceptable range
   */
  validateConfidenceScore(score: number): number {
    if (typeof score !== 'number' || isNaN(score)) {
      Logger.warn('Invalid confidence score provided, using default');
      return 0.5;
    }

    return Math.min(0.95, Math.max(0.05, score));
  }
}
