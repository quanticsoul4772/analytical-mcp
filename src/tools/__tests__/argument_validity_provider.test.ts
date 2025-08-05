import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  ArgumentValidityProvider,
  ValidityPatterns,
  ScoringResult
} from '../argument_validity_provider.js';
import { ValidationHelpers } from '../../utils/validation_helpers.js';

// Mock ValidationHelpers
jest.mock('../../utils/validation_helpers.js');

describe('ArgumentValidityProvider', () => {
  let provider: ArgumentValidityProvider;
  const mockValidationHelpers = ValidationHelpers as jest.Mocked<typeof ValidationHelpers>;

  beforeEach(() => {
    provider = new ArgumentValidityProvider();
    jest.clearAllMocks();
    
    // Setup default mocks
    mockValidationHelpers.validateNonEmptyString.mockReturnValue({ isValid: true });
    mockValidationHelpers.validateDataArray.mockReturnValue({ isValid: true });
    mockValidationHelpers.throwIfInvalid.mockImplementation(() => {});
  });

  describe('analyzeArgumentValidity', () => {
    describe('happy path', () => {
      it('should analyze a basic argument without special patterns', () => {
        const argument = 'This is a simple argument. It has a conclusion.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('### Argument Validity');
        expect(result).toContain('**Validity Assessment:**');
        expect(result).toContain('**Note:**');
        expect(mockValidationHelpers.validateNonEmptyString).toHaveBeenCalledWith(argument);
      });

      it('should detect conditional reasoning patterns', () => {
        const argument = 'If it rains, then the ground gets wet. The ground is wet.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('conditional reasoning (if-then structure)');
        expect(result).toContain('valid logical structure with clear premises');
      });

      it('should detect premise and conclusion connectors', () => {
        const argument = 'Because it is raining, therefore the ground is wet.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('clearly distinguishes premises from conclusions');
        expect(result).toContain('valid logical structure with clear premises');
      });

      it('should detect partial connector usage', () => {
        const argument = 'Because it is raining, the ground is wet.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('uses some logical connectors');
        expect(result).toContain('could be more explicit');
      });

      it('should detect evidence terms', () => {
        const argument = 'Research shows that this approach works. Therefore, we should use it.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('references evidence or supporting information');
      });

      it('should provide high validity assessment for well-structured arguments', () => {
        const argument = 'If research shows effectiveness, then we should adopt the method. Studies demonstrate clear evidence of success. Therefore, we should implement this approach.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('valid logical structure with clear premises leading to conclusions');
      });

      it('should provide medium validity assessment for partially structured arguments', () => {
        const argument = 'Because of evidence, this conclusion follows.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('some elements of valid logical structure');
      });

      it('should provide low validity assessment for poorly structured arguments', () => {
        const argument = 'This is true. That is also true.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('significant logical structure issues');
      });

      it('should detect various conditional patterns', () => {
        const conditionalArguments = [
          'When the sun rises, then it becomes day.',
          'Unless you study, then you will fail.',
          'Given that it rains, it follows that ground gets wet.',
          'Since studies show this, therefore we conclude that.'
        ];

        conditionalArguments.forEach(argument => {
          const result = provider.analyzeArgumentValidity(argument);
          expect(result).toContain('conditional reasoning');
        });
      });

      it('should detect various premise connectors', () => {
        const premiseArguments = [
          'Because of this reason, conclusion follows.',
          'Since this is true, that follows.',
          'As we know this, we can conclude.',
          'Given that this occurs, result happens.',
          'For this reason, outcome occurs.',
          'Considering that evidence, conclusion follows.'
        ];

        premiseArguments.forEach(argument => {
          const result = provider.analyzeArgumentValidity(argument);
          expect(result).toContain('logical connectors');
        });
      });

      it('should detect various conclusion connectors', () => {
        const conclusionArguments = [
          'Evidence exists, therefore conclusion follows.',
          'Premise is true, thus result occurs.',
          'Given facts, hence outcome happens.',
          'Evidence shows, consequently we conclude.',
          'Facts indicate, so result follows.',
          'Premise leads, it follows that conclusion.',
          'Evidence points, as a result outcome occurs.'
        ];

        conclusionArguments.forEach(argument => {
          const result = provider.analyzeArgumentValidity(argument);
          expect(result).toContain('logical connectors');
        });
      });

      it('should detect various evidence terms', () => {
        const evidenceArguments = [
          'Evidence shows this conclusion.',
          'Data indicates this result.',
          'Study demonstrates this outcome.',
          'Research proves this point.',
          'Statistics support this view.',
          'Example illustrates this concept.',
          'Survey reveals this finding.',
          'Experiment confirms this hypothesis.',
          'Observation suggests this conclusion.'
        ];

        evidenceArguments.forEach(argument => {
          const result = provider.analyzeArgumentValidity(argument);
          expect(result).toContain('references evidence');
        });
      });
    });

    describe('edge cases', () => {
      it('should handle single sentence arguments', () => {
        const argument = 'This is a single sentence argument.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('### Argument Validity');
        expect(result).toContain('lacks clear logical connectors');
      });

      it('should handle arguments with multiple punctuation marks', () => {
        const argument = 'This is true!!! Therefore, that follows???';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('### Argument Validity');
        expect(result).toContain('logical connectors');
      });

      it('should handle case-insensitive pattern matching', () => {
        const argument = 'IF conditions are met, THEN results follow. BECAUSE evidence shows, THEREFORE conclusion.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('conditional reasoning');
        expect(result).toContain('clearly distinguishes premises');
      });

      it('should detect circular reasoning with similar words', () => {
        const argument = 'People should exercise regularly because exercising people are healthy. Therefore, people should exercise regularly for health.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('circular reasoning');
        expect(result).toContain('conclusion appears to restate the premise');
      });

      it('should not flag circular reasoning when sentences are different', () => {
        const argument = 'Exercise improves health. Therefore, we should maintain physical activity.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).not.toContain('circular reasoning');
      });

      it('should not flag circular reasoning for single sentences', () => {
        const argument = 'Exercise is good for health.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).not.toContain('circular reasoning');
      });

      it('should handle arguments with short words that might cause false positives', () => {
        const argument = 'It is true. So it is true.';
        const result = provider.analyzeArgumentValidity(argument);

        // Should not flag as circular because words are too short (length <= 3)
        expect(result).not.toContain('circular reasoning');
      });

      it('should handle arguments without terminal punctuation', () => {
        const argument = 'This argument has no punctuation but should still work';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('### Argument Validity');
      });
    });

    describe('error handling', () => {
      it('should throw error for empty string', () => {
        mockValidationHelpers.validateNonEmptyString.mockReturnValue({ isValid: false, error: 'Empty string' });
        mockValidationHelpers.throwIfInvalid.mockImplementation((result) => {
          if (!result.isValid) throw new Error(result.error);
        });

        expect(() => provider.analyzeArgumentValidity('')).toThrow('Empty string');
      });

      it('should throw error for null input', () => {
        mockValidationHelpers.validateNonEmptyString.mockReturnValue({ isValid: false, error: 'Null input' });
        mockValidationHelpers.throwIfInvalid.mockImplementation((result) => {
          if (!result.isValid) throw new Error(result.error);
        });

        expect(() => provider.analyzeArgumentValidity(null as any)).toThrow('Null input');
      });

      it('should handle validation error in circular reasoning detection', () => {
        mockValidationHelpers.validateDataArray.mockReturnValue({ isValid: false, error: 'Invalid array' });
        mockValidationHelpers.throwIfInvalid.mockImplementation((result) => {
          if (!result.isValid) throw new Error(result.error);
        });

        expect(() => provider.analyzeArgumentValidity('test argument. another sentence.')).toThrow('Invalid array');
      });
    });
  });

  describe('getValidityPatterns', () => {
    describe('happy path', () => {
      it('should return validity patterns object', () => {
        const argument = 'If this is true, then that follows. Because evidence shows, therefore conclusion.';
        const patterns = provider.getValidityPatterns(argument);

        expect(patterns).toHaveProperty('hasConditional');
        expect(patterns).toHaveProperty('hasPremiseConnectors');
        expect(patterns).toHaveProperty('hasConclusionConnectors');
        expect(patterns).toHaveProperty('hasEvidenceTerms');
        expect(typeof patterns.hasConditional).toBe('boolean');
      });

      it('should detect conditional patterns correctly', () => {
        const conditionalArgs = [
          'If this, then that.',
          'When conditions are met, then results follow.',
          'Unless you act, then consequences occur.',
          'Given facts, it follows that conclusion.',
          'Since premise is true, therefore conclusion.'
        ];

        conditionalArgs.forEach(argument => {
          const patterns = provider.getValidityPatterns(argument);
          expect(patterns.hasConditional).toBe(true);
        });
      });

      it('should detect premise connectors correctly', () => {
        const premiseArgs = [
          'Because of this reason.',
          'Since this is true.',
          'As we know.',
          'Given that this occurs.',
          'For this reason.',
          'Considering that evidence.'
        ];

        premiseArgs.forEach(argument => {
          const patterns = provider.getValidityPatterns(argument);
          expect(patterns.hasPremiseConnectors).toBe(true);
        });
      });

      it('should detect conclusion connectors correctly', () => {
        const conclusionArgs = [
          'Therefore, conclusion follows.',
          'Thus, result occurs.',
          'Hence, outcome happens.',
          'Consequently, we conclude.',
          'So, result follows.',
          'It follows that conclusion.',
          'As a result, outcome occurs.'
        ];

        conclusionArgs.forEach(argument => {
          const patterns = provider.getValidityPatterns(argument);
          expect(patterns.hasConclusionConnectors).toBe(true);
        });
      });

      it('should detect evidence terms correctly', () => {
        const evidenceArgs = [
          'Evidence shows this.',
          'Data indicates this.',
          'Study demonstrates this.',
          'Research proves this.',
          'Statistics support this.',
          'Example illustrates this.',
          'Survey reveals this.',
          'Experiment confirms this.',
          'Observation suggests this.'
        ];

        evidenceArgs.forEach(argument => {
          const patterns = provider.getValidityPatterns(argument);
          expect(patterns.hasEvidenceTerms).toBe(true);
        });
      });

      it('should return false for patterns not present', () => {
        const argument = 'Simple statement without special terms.';
        const patterns = provider.getValidityPatterns(argument);

        expect(patterns.hasConditional).toBe(false);
        expect(patterns.hasPremiseConnectors).toBe(false);
        expect(patterns.hasConclusionConnectors).toBe(false);
        expect(patterns.hasEvidenceTerms).toBe(false);
      });

      it('should handle mixed patterns', () => {
        const argument = 'If research shows evidence, then because studies prove it, therefore we conclude.';
        const patterns = provider.getValidityPatterns(argument);

        expect(patterns.hasConditional).toBe(true);
        expect(patterns.hasPremiseConnectors).toBe(true);
        expect(patterns.hasConclusionConnectors).toBe(true);
        expect(patterns.hasEvidenceTerms).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle case insensitive matching', () => {
        const argument = 'IF this, THEN that. BECAUSE evidence, THEREFORE conclusion.';
        const patterns = provider.getValidityPatterns(argument);

        expect(patterns.hasConditional).toBe(true);
        expect(patterns.hasPremiseConnectors).toBe(true);
        expect(patterns.hasConclusionConnectors).toBe(true);
      });

      it('should not match partial words', () => {
        const argument = 'Therein lies the problem. Heretofore we proceed.';
        const patterns = provider.getValidityPatterns(argument);

        expect(patterns.hasConditional).toBe(false);
        expect(patterns.hasConclusionConnectors).toBe(false);
      });

      it('should handle empty-like arguments', () => {
        const argument = '   ';
        const patterns = provider.getValidityPatterns(argument);

        expect(patterns.hasConditional).toBe(false);
        expect(patterns.hasPremiseConnectors).toBe(false);
        expect(patterns.hasConclusionConnectors).toBe(false);
        expect(patterns.hasEvidenceTerms).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid input', () => {
        mockValidationHelpers.validateNonEmptyString.mockReturnValue({ isValid: false, error: 'Invalid input' });
        mockValidationHelpers.throwIfInvalid.mockImplementation((result) => {
          if (!result.isValid) throw new Error(result.error);
        });

        expect(() => provider.getValidityPatterns('')).toThrow('Invalid input');
      });
    });
  });

  describe('scoring system', () => {
    describe('happy path', () => {
      it('should score high for arguments with multiple positive patterns', () => {
        const argument = 'If research provides evidence, then because studies demonstrate effectiveness, therefore we should adopt this approach.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('valid logical structure with clear premises leading to conclusions');
      });

      it('should score medium for arguments with some patterns', () => {
        const argument = 'Because evidence exists, this approach works.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('some elements of valid logical structure');
      });

      it('should score low for arguments with few patterns', () => {
        const argument = 'This is true. That is false.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('significant logical structure issues');
      });

      it('should penalize circular reasoning', () => {
        const argument = 'People should exercise regularly because regular exercise helps people stay healthy.';
        const result = provider.analyzeArgumentValidity(argument);

        expect(result).toContain('circular reasoning');
      });
    });
  });

  describe('performance', () => {
    it('should handle long arguments efficiently', () => {
      const longArgument = 'If research shows effectiveness, then we should proceed. '.repeat(50) + 
        'Because evidence demonstrates this. Therefore, we conclude this approach works.';
      
      const startTime = Date.now();
      const result = provider.analyzeArgumentValidity(longArgument);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result).toContain('### Argument Validity');
    });

    it('should handle multiple rapid analyses', () => {
      const testArguments = [
        'If this, then that.',
        'Because reason, therefore conclusion.',
        'Research shows evidence supports this view.',
        'Simple statement without structure.'
      ];

      const startTime = Date.now();
      const results = testArguments.map(arg => provider.analyzeArgumentValidity(arg));
      const endTime = Date.now();

      expect(results).toHaveLength(4);
      expect(endTime - startTime).toBeLessThan(500);
      results.forEach(result => {
        expect(result).toContain('### Argument Validity');
      });
    });

    it('should handle rapid pattern detection calls', () => {
      const testArguments = [
        'If condition, then result.',
        'Because premise, conclusion follows.',
        'Evidence shows this approach works.',
        'Therefore, we should proceed.'
      ];

      const startTime = Date.now();
      const patterns = arguments.map(arg => provider.getValidityPatterns(arg));
      const endTime = Date.now();

      expect(patterns).toHaveLength(4);
      expect(endTime - startTime).toBeLessThan(100);
      patterns.forEach(pattern => {
        expect(pattern).toHaveProperty('hasConditional');
      });
    });
  });
});