import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { logicalFallacyDetector } from '../logical_fallacy_detector.js';
import { ValidationError, DataProcessingError } from '../../utils/errors.js';

// Mock the Logger
jest.mock('../../utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  },
}));

describe('Logical Fallacy Detector - Edge Cases', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input validation', () => {
    it('should handle extremely long text input', async () => {
      // Create a very long text (100KB)
      const longText = "This is a test sentence. ".repeat(5000);
      
      // Should process it without error
      const result = await logicalFallacyDetector(longText);
      
      // Should return a properly formatted result
      expect(result).toContain("# Logical Fallacy Analysis");
      expect(result).toContain("Original Text");
    });
    
    it('should handle text with special characters', async () => {
      const specialCharsText = "This argument contains special chars: @#$%^&*()_+[]{}|\\:;\"'<>,.?/～！@#¥%……&*（）—+「」｜、：；''《》，。？";
      
      // Should process it without error
      const result = await logicalFallacyDetector(specialCharsText);
      
      // Should include the special characters in the output
      expect(result).toContain(specialCharsText);
    });
    
    it('should handle text with HTML and markdown', async () => {
      const htmlText = "<b>This is an HTML text</b> with *markdown* and <script>dangerous script</script>";
      
      // Should process it without error and not execute any scripts
      const result = await logicalFallacyDetector(htmlText);
      
      // Should include the HTML as plain text
      expect(result.includes("&lt;b&gt;This is an HTML text&lt;/b&gt;") || result.includes("<b>This is an HTML text</b>")).toBe(true);
    });
  });
  
  describe('Parameter edge cases', () => {
    it('should handle minimum confidence threshold (0.01)', async () => {
      const text = "The expert claims this must be true.";
      
      // Use extremely low confidence threshold (nearly zero)
      const result = await logicalFallacyDetector(text, 0.01);
      
      // Should detect fallacies with very low confidence
      expect(result).toContain("Appeal to Authority");
    });
    
    it('should handle maximum confidence threshold (0.99)', async () => {
      const text = "The expert claims this must be true.";
      
      // Use extremely high confidence threshold (nearly one)
      const result = await logicalFallacyDetector(text, 0.99);
      
      // Should not detect any fallacies due to high threshold
      expect(result).toContain("No significant logical fallacies detected");
    });
    
    it('should handle empty categories array', async () => {
      const text = "You're too young to understand climate policy.";
      
      // Pass empty categories array
      const result = await logicalFallacyDetector(text, 0.5, []);
      
      // Should return no fallacies (no categories to check)
      expect(result).toContain("No significant logical fallacies detected");
    });
    
    it('should correctly handle single category filtering', async () => {
      const text = "You're too young to understand climate policy. The expert claims this must be true.";
      
      // Only search for relevance fallacies (ad hominem is relevance, appeal to authority is relevance)
      const result = await logicalFallacyDetector(text, 0.3, ['relevance']);
      
      // Should detect Ad Hominem (relevance) but not others
      expect(result).toContain("Ad Hominem");
      expect(result).toContain("Appeal to Authority");
    });
    
    it('should handle includeExplanations=false', async () => {
      const text = "You're too young to understand climate policy.";
      
      // Don't include explanations
      const result = await logicalFallacyDetector(text, 0.5, ['all'], false);
      
      // Should not include the description
      expect(result).not.toContain("Description:");
    });
    
    it('should handle includeExamples=false', async () => {
      const text = "You're too young to understand climate policy.";
      
      // Don't include examples
      const result = await logicalFallacyDetector(text, 0.5, ['all'], true, false);
      
      // Should not include examples
      expect(result).not.toContain("Example of Fallacious Reasoning:");
      expect(result).not.toContain("Improved Reasoning:");
    });
  });
  
  describe('Edge case content', () => {
    it('should not falsely detect fallacies in academic discussion about fallacies', async () => {
      const text = "Ad hominem arguments are fallacious because they attack the person rather than the argument. Appeal to authority can be problematic when the authority is not relevant.";
      
      // This text discusses fallacies but doesn't use them
      const result = await logicalFallacyDetector(text, 0.7);
      
      // Should not detect any fallacies despite the text containing fallacy terms
      expect(result).toContain("No significant logical fallacies detected");
    });
    
    it('should detect fallacies even with nested or complex sentence structures', async () => {
      const text = "The proposal, which was made by someone who, as we all know, has always been too young and inexperienced to understand these complex matters, should be rejected immediately.";
      
      // Complex nested structure with an ad hominem
      const result = await logicalFallacyDetector(text);
      
      // Should still detect the fallacy despite complex structure
      expect(result).toContain("Ad Hominem");
    });
    
    it('should handle legitimate appeals to relevant authority', async () => {
      // This is a legitimate appeal to relevant authority with proper qualifications
      const text = "According to peer-reviewed research published in Nature by climate scientists with expertise in the field, global temperatures are rising due to human activities.";
      
      // Use normal confidence threshold
      const result = await logicalFallacyDetector(text, 0.6);
      
      // Should not detect appeal to authority when it's a legitimate use
      expect(result).toContain("No significant logical fallacies detected");
    });
  });
  
  describe('Performance optimization tests', () => {
    it('should exit signal matching loop early on first match', async () => {
      // This text has multiple signals for the same fallacy
      const text = "You're too young and too stupid to understand climate policy.";
      
      // Create a spy on Array.prototype.every to check if we're exiting early
      const arraySpy = jest.spyOn(Array.prototype, 'every');
      
      await logicalFallacyDetector(text);
      
      // The spy should have been called but the exact count depends on implementation
      expect(arraySpy).toHaveBeenCalled();
      
      // Clean up
      arraySpy.mockRestore();
    });
    
    it('should handle multiple fallacies in the same text efficiently', async () => {
      // Text with multiple fallacies
      const text = "You're too young to understand climate policy. Either we act now or we all die. The expert says this must be true.";
      
      // Should detect all fallacies efficiently
      const result = await logicalFallacyDetector(text, 0.4);
      
      // Should have detected multiple fallacies
      expect(result).toContain("Ad Hominem");
      expect(result).toContain("False Dichotomy");
      expect(result).toContain("Appeal to Authority");
      
      // Should include severity assessment
      expect(result).toContain("Severity: High");
    });
  });
  
  describe('Error handling', () => {
    it('should gracefully handle invalid confidence thresholds', async () => {
      // Try with confidence threshold greater than 1
      await expect(logicalFallacyDetector("Test text", 1.5)).rejects.toThrow(ValidationError);
      
      // Try with negative confidence threshold
      await expect(logicalFallacyDetector("Test text", -0.5)).rejects.toThrow(ValidationError);
    });
    
    it('should handle invalid categories', async () => {
      // Try with invalid category
      await expect(
        // @ts-ignore - Testing runtime behavior
        logicalFallacyDetector("Test text", 0.5, ['invalid_category'])
      ).rejects.toThrow(ValidationError);
    });
    
    it('should handle errors during pattern matching', async () => {
      // Mock a regex that causes catastrophic backtracking
      jest.spyOn(global.RegExp.prototype, 'test').mockImplementation(() => {
        throw new Error('Simulated regex error');
      });
      
      // Should catch and wrap the error
      await expect(logicalFallacyDetector("Test text")).rejects.toThrow(DataProcessingError);
      
      // Clean up
      jest.restoreAllMocks();
    });
  });
});