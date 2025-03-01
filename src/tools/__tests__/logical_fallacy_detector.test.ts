import { describe, it, expect } from '@jest/globals';
import { logicalFallacyDetector } from '../logical_fallacy_detector.js';

describe('Logical Fallacy Detector', () => {

  it('should detect ad hominem fallacy', async () => {
    const text = "You're too young to understand climate policy, so your arguments are invalid.";
    const result = await logicalFallacyDetector(text);
    
    expect(result).toContain("Ad Hominem");
    expect(result).toContain("Attacking the person making the argument");
  });

  it('should detect appeal to authority fallacy', async () => {
    const text = "The celebrity doctor says this diet works, so it must be true!";
    const result = await logicalFallacyDetector(text, 0.3);
    
    expect(result).toContain("Appeal to Authority");
    expect(result).toContain("Claiming something is true because an authority figure says so");
  });

  it('should return no fallacies for well-reasoned text', async () => {
    const text = "Based on multiple peer-reviewed studies, we can conclude that regular exercise contributes to better cardiovascular health.";
    const result = await logicalFallacyDetector(text);
    
    expect(result).toContain("No significant logical fallacies detected");
  });

  it('should respect confidence threshold', async () => {
    const text = "An expert once told me that this theory is probably true.";
    const highConfidenceResult = await logicalFallacyDetector(text, 0.7);
    const lowConfidenceResult = await logicalFallacyDetector(text, 0.3);
    
    expect(highConfidenceResult).toContain("No significant logical fallacies detected");
    expect(lowConfidenceResult).toContain("Appeal to Authority");
  });

  it('should filter fallacies by category', async () => {
    const text = "Experts claim this diet works, and you're stupid if you don't believe them!";
    const relevanceResult = await logicalFallacyDetector(text, 0.3, ['relevance']);
    const informalResult = await logicalFallacyDetector(text, 0.5, ['relevance']);
    
    expect(relevanceResult).toContain("Appeal to Authority");
    expect(relevanceResult).toContain("Ad Hominem");
    
    expect(informalResult).toContain("Ad Hominem");
  });
});
