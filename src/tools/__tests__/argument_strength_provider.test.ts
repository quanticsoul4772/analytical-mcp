import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ArgumentStrengthProvider, StrengthFactor } from '../argument_strength_provider.js';
import { ValidationHelpers } from '../../utils/validation_helpers.js';

// Mock ValidationHelpers
jest.mock('../../utils/validation_helpers.js');

describe('ArgumentStrengthProvider', () => {
  let provider: ArgumentStrengthProvider;
  const mockValidationHelpers = ValidationHelpers as jest.Mocked<typeof ValidationHelpers>;

  beforeEach(() => {
    provider = new ArgumentStrengthProvider();
    jest.clearAllMocks();
    
    // Setup default mocks
    mockValidationHelpers.validateNonEmptyString.mockReturnValue({ isValid: true });
    mockValidationHelpers.validateDataArray.mockReturnValue({ isValid: true });
    mockValidationHelpers.throwIfInvalid.mockImplementation(() => {});
  });

  describe('analyzeArgumentStrength', () => {
    describe('happy path', () => {
      it('should analyze a basic argument without special factors', async () => {
        const argument = 'This is a simple argument without special terms.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).toContain('### Argument Strength');
        expect(result).toContain('**Strength Assessment:**');
        expect(result).toContain('**Strength Factors Analysis:**');
        expect(result).toContain('**Factor Details:**');
        expect(mockValidationHelpers.validateNonEmptyString).toHaveBeenCalledWith(argument);
      });

      it('should detect evidence support factor', async () => {
        const argument = 'According to recent research and data from multiple studies, this conclusion is supported.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).toContain('Evidence Support');
        expect(result).toContain('The argument references evidence or supporting information');
        expect(result).toContain('➕ Positive');
      });

      it('should detect quantitative information', async () => {
        const argument = 'Studies show that 75% of participants experienced improvement.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).toContain('Quantitative Information');
        expect(result).toContain('The argument includes specific quantities or statistics');
      });

      it('should detect alternative considerations', async () => {
        const argument = 'While this is true, we must consider alternative explanations and other possibilities.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).toContain('Alternative Consideration');
        expect(result).toContain('The argument acknowledges alternative explanations or perspectives');
      });

      it('should detect appropriate qualifiers', async () => {
        const argument = 'The data suggests that this approach might be effective and probably works well.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).toContain('Appropriate Certainty');
        expect(result).toContain('The argument uses appropriate qualifiers when expressing certainty');
      });

      it('should detect expert consensus', async () => {
        const argument = 'There is widespread consensus among experts that this approach is generally accepted.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).toContain('Expert Consensus');
        expect(result).toContain('The argument references expert consensus');
      });

      it('should detect counterargument acknowledgment', async () => {
        const argument = 'Critics argue against this view, however, the evidence supports our position.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).toContain('Counterargument Acknowledgment');
        expect(result).toContain('The argument acknowledges opposing viewpoints');
      });

      it('should generate strong assessment for high-scoring arguments', async () => {
        const argument = 'Research data shows 80% effectiveness. Experts consensus supports this. However, critics argue alternatives exist.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).toContain('strong logical foundation with multiple supporting elements');
      });

      it('should generate adequate assessment for medium-scoring arguments', async () => {
        const argument = 'Some evidence suggests this might work effectively.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).toContain('adequate logical foundation but could be strengthened');
      });

      it('should generate weak assessment for low-scoring arguments', async () => {
        const argument = 'This causes that because I said so.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).toContain('several weaknesses that significantly impact');
      });
    });

    describe('edge cases', () => {
      it('should handle very short arguments', async () => {
        const argument = 'Yes.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).toContain('### Argument Strength');
        expect(result).toContain('lacks explicit reference to evidence');
      });

      it('should handle very long arguments', async () => {
        const argument = 'A'.repeat(1000) + ' research shows evidence supports this with data from studies.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).toContain('Evidence Support');
        expect(result).toContain('### Argument Strength');
      });

      it('should handle arguments with special characters', async () => {
        const argument = 'Studies show 50% success @#$%^&*()! However, critics argue alternatives.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).toContain('Quantitative Information');
        expect(result).toContain('Counterargument Acknowledgment');
      });

      it('should detect causal reasoning without alternatives', async () => {
        const argument = 'A causes B because A leads to B in all cases.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).toContain('Causal Reasoning Issues');
        expect(result).toContain('makes causal claims without considering alternative explanations');
        expect(result).toContain('➖ Negative');
      });

      it('should detect correlation-causation confusion', async () => {
        const argument = 'X is correlated with Y, therefore X causes Y to occur.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).toContain('Correlation-Causation Confusion');
        expect(result).toContain('may confuse correlation with causation');
      });

      it('should not flag causal reasoning when alternatives are considered', async () => {
        const argument = 'A causes B, but alternative explanations could also account for this relationship.';
        const result = provider.analyzeArgumentStrength(argument);

        expect(result).not.toContain('Causal Reasoning Issues');
        expect(result).toContain('Alternative Consideration');
      });
    });

    describe('error handling', () => {
      it('should throw error for empty string', async () => {
        mockValidationHelpers.validateNonEmptyString.mockReturnValue({ isValid: false, error: 'Empty string' });
        mockValidationHelpers.throwIfInvalid.mockImplementation((result) => {
          if (!result.isValid) throw new Error(result.error);
        });

        expect(() => provider.analyzeArgumentStrength('')).toThrow('Empty string');
      });

      it('should throw error for null input', async () => {
        mockValidationHelpers.validateNonEmptyString.mockReturnValue({ isValid: false, error: 'Null input' });
        mockValidationHelpers.throwIfInvalid.mockImplementation((result) => {
          if (!result.isValid) throw new Error(result.error);
        });

        expect(() => provider.analyzeArgumentStrength(null as any)).toThrow('Null input');
      });

      it('should handle validation error in strength assessment generation', async () => {
        mockValidationHelpers.validateDataArray.mockReturnValue({ isValid: false, error: 'Invalid array' });
        mockValidationHelpers.throwIfInvalid.mockImplementation((result) => {
          if (!result.isValid) throw new Error(result.error);
        });

        // This should trigger the validation in generateStrengthAssessment
        expect(() => provider.analyzeArgumentStrength('test argument')).toThrow('Invalid array');
      });
    });
  });

  describe('getStrengthFactors', () => {
    describe('happy path', () => {
      it('should return strength factors array', async () => {
        const argument = 'Research shows 75% effectiveness with data supporting this conclusion.';
        const factors = provider.getStrengthFactors(argument);

        expect(Array.isArray(factors)).toBe(true);
        expect(factors.length).toBeGreaterThan(0);
        expect(factors[0]).toHaveProperty('name');
        expect(factors[0]).toHaveProperty('present');
        expect(factors[0]).toHaveProperty('evidence');
        expect(factors[0]).toHaveProperty('impact');
      });

      it('should include all standard factors', async () => {
        const argument = 'Research data shows 80% effectiveness. Experts consensus supports this. However, critics argue alternatives might exist.';
        const factors = provider.getStrengthFactors(argument);

        const factorNames = factors.map(f => f.name);
        expect(factorNames).toContain('Evidence Support');
        expect(factorNames).toContain('Quantitative Information');
        expect(factorNames).toContain('Alternative Consideration');
        expect(factorNames).toContain('Appropriate Certainty');
        expect(factorNames).toContain('Expert Consensus');
        expect(factorNames).toContain('Counterargument Acknowledgment');
      });

      it('should include causal reasoning factors when applicable', async () => {
        const argument = 'X causes Y without considering other explanations.';
        const factors = provider.getStrengthFactors(argument);

        const factorNames = factors.map(f => f.name);
        expect(factorNames).toContain('Causal Reasoning Issues');
      });
    });

    describe('edge cases', () => {
      it('should handle argument with no detectable factors', async () => {
        const argument = 'Simple statement.';
        const factors = provider.getStrengthFactors(argument);

        expect(Array.isArray(factors)).toBe(true);
        // Should still have all the standard factors, just with present: false
        expect(factors.length).toBeGreaterThanOrEqual(6);
      });

      it('should properly identify positive and negative impacts', async () => {
        const argument = 'Research shows evidence but causes problems without alternatives.';
        const factors = provider.getStrengthFactors(argument);

        const evidenceFactor = factors.find(f => f.name === 'Evidence Support');
        const causalFactor = factors.find(f => f.name === 'Causal Reasoning Issues');

        expect(evidenceFactor?.impact).toBeGreaterThan(0);
        expect(causalFactor?.impact).toBeLessThan(0);
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid input', async () => {
        mockValidationHelpers.validateNonEmptyString.mockReturnValue({ isValid: false, error: 'Invalid input' });
        mockValidationHelpers.throwIfInvalid.mockImplementation((result) => {
          if (!result.isValid) throw new Error(result.error);
        });

        expect(() => provider.getStrengthFactors('')).toThrow('Invalid input');
      });
    });
  });

  describe('performance', () => {
    it('should handle large arguments efficiently', async () => {
      const largeArgument = 'This argument contains research data and evidence. '.repeat(100) +
        'Studies show 85% effectiveness with expert consensus supporting these findings.';
      
      const startTime = Date.now();
      const result = provider.analyzeArgumentStrength(largeArgument);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result).toContain('### Argument Strength');
    });

    it('should handle multiple rapid calls', async () => {
      const arguments = [
        'Research shows evidence',
        'Data indicates 75% success',
        'Experts agree on consensus',
        'Critics argue alternatives exist'
      ];

      const startTime = Date.now();
      const results = arguments.map(arg => provider.analyzeArgumentStrength(arg));
      const endTime = Date.now();

      expect(results).toHaveLength(4);
      expect(endTime - startTime).toBeLessThan(500);
      results.forEach(result => {
        expect(result).toContain('### Argument Strength');
      });
    });
  });
});