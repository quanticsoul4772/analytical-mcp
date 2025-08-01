import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  ArgumentStructureProvider,
  SentenceAnalysisResult,
  IndicatorWordsResult,
  PremisesConclusionsResult
} from '../argument_structure_provider.js';
import { ValidationHelpers } from '../../utils/validation_helpers.js';

// Mock ValidationHelpers
jest.mock('../../utils/validation_helpers.js');

describe('ArgumentStructureProvider', () => {
  let provider: ArgumentStructureProvider;
  const mockValidationHelpers = ValidationHelpers as jest.Mocked<typeof ValidationHelpers>;

  beforeEach(() => {
    provider = new ArgumentStructureProvider();
    jest.clearAllMocks();
    
    // Setup default mocks
    mockValidationHelpers.validateNonEmptyString.mockReturnValue({ isValid: true });
    mockValidationHelpers.validateDataArray.mockReturnValue({ isValid: true });
    mockValidationHelpers.throwIfInvalid.mockImplementation(() => {});
  });

  describe('getSentenceAnalysis', () => {
    describe('happy path', () => {
      it('should analyze single sentence arguments', () => {
        const argument = 'This is a simple argument.';
        const result = provider.getSentenceAnalysis(argument);

        expect(result).toEqual({
          sentenceCount: 1,
          sentences: ['This is a simple argument']
        });
        expect(mockValidationHelpers.validateNonEmptyString).toHaveBeenCalledWith(argument);
      });

      it('should analyze multi-sentence arguments with periods', () => {
        const argument = 'First sentence. Second sentence. Third sentence.';
        const result = provider.getSentenceAnalysis(argument);

        expect(result).toEqual({
          sentenceCount: 3,
          sentences: ['First sentence', 'Second sentence', 'Third sentence']
        });
      });

      it('should handle exclamation marks and question marks', () => {
        const argument = 'Statement one! Is this a question? Final statement.';
        const result = provider.getSentenceAnalysis(argument);

        expect(result).toEqual({
          sentenceCount: 3,
          sentences: ['Statement one', 'Is this a question', 'Final statement']
        });
      });

      it('should handle mixed punctuation', () => {
        const argument = 'First sentence. Second! Third? Fourth.';
        const result = provider.getSentenceAnalysis(argument);

        expect(result.sentenceCount).toBe(4);
        expect(result.sentences).toEqual(['First sentence', 'Second', 'Third', 'Fourth']);
      });

      it('should trim whitespace from sentences', () => {
        const argument = 'First sentence.   Second sentence.     Third sentence.';
        const result = provider.getSentenceAnalysis(argument);

        expect(result.sentences).toEqual(['First sentence', 'Second sentence', 'Third sentence']);
      });
    });

    describe('edge cases', () => {
      it('should handle arguments with multiple consecutive punctuation marks', () => {
        const argument = 'First sentence... Second sentence!!! Third sentence???';
        const result = provider.getSentenceAnalysis(argument);

        expect(result.sentenceCount).toBe(3);
        expect(result.sentences).toEqual(['First sentence', 'Second sentence', 'Third sentence']);
      });

      it('should filter out empty sentences', () => {
        const argument = 'First sentence. . . Second sentence.';
        const result = provider.getSentenceAnalysis(argument);

        expect(result.sentenceCount).toBe(2);
        expect(result.sentences).toEqual(['First sentence', 'Second sentence']);
      });

      it('should handle arguments without terminal punctuation', () => {
        const argument = 'This argument has no punctuation';
        const result = provider.getSentenceAnalysis(argument);

        expect(result.sentenceCount).toBe(1);
        expect(result.sentences).toEqual(['This argument has no punctuation']);
      });

      it('should handle empty strings after splitting', () => {
        const argument = 'First sentence.. . Second sentence.';
        const result = provider.getSentenceAnalysis(argument);

        expect(result.sentences).not.toContain('');
        expect(result.sentences.length).toBe(2);
      });
    });

    describe('error handling', () => {
      it('should throw error for empty string', () => {
        mockValidationHelpers.validateNonEmptyString.mockReturnValue({ isValid: false, error: 'Empty string' });
        mockValidationHelpers.throwIfInvalid.mockImplementation((result) => {
          if (!result.isValid) throw new Error(result.error);
        });

        expect(() => provider.getSentenceAnalysis('')).toThrow('Empty string');
      });

      it('should throw error for null input', () => {
        mockValidationHelpers.validateNonEmptyString.mockReturnValue({ isValid: false, error: 'Null input' });
        mockValidationHelpers.throwIfInvalid.mockImplementation((result) => {
          if (!result.isValid) throw new Error(result.error);
        });

        expect(() => provider.getSentenceAnalysis(null as any)).toThrow('Null input');
      });
    });
  });

  describe('getIndicatorWords', () => {
    describe('happy path', () => {
      it('should return predefined indicator words', () => {
        const result = provider.getIndicatorWords();

        expect(result).toHaveProperty('conclusionIndicators');
        expect(result).toHaveProperty('premiseIndicators');
        expect(Array.isArray(result.conclusionIndicators)).toBe(true);
        expect(Array.isArray(result.premiseIndicators)).toBe(true);
      });

      it('should include common conclusion indicators', () => {
        const result = provider.getIndicatorWords();

        expect(result.conclusionIndicators).toContain('therefore');
        expect(result.conclusionIndicators).toContain('thus');
        expect(result.conclusionIndicators).toContain('hence');
        expect(result.conclusionIndicators).toContain('consequently');
        expect(result.conclusionIndicators).toContain('so');
      });

      it('should include common premise indicators', () => {
        const result = provider.getIndicatorWords();

        expect(result.premiseIndicators).toContain('because');
        expect(result.premiseIndicators).toContain('since');
        expect(result.premiseIndicators).toContain('as');
        expect(result.premiseIndicators).toContain('given that');
        expect(result.premiseIndicators).toContain('for');
      });

      it('should return consistent results across calls', () => {
        const result1 = provider.getIndicatorWords();
        const result2 = provider.getIndicatorWords();

        expect(result1).toEqual(result2);
      });
    });
  });

  describe('identifyPremisesAndConclusions', () => {
    const sampleSentences = ['First sentence', 'Second sentence', 'Third sentence'];
    const sampleConclusionIndicators = ['therefore', 'thus', 'hence'];
    const samplePremiseIndicators = ['because', 'since', 'as'];

    describe('happy path', () => {
      it('should identify conclusions with indicator words', () => {
        const sentences = ['All men are mortal', 'Therefore, Socrates is mortal'];
        const result = provider.identifyPremisesAndConclusions(
          sentences,
          sampleConclusionIndicators,
          samplePremiseIndicators
        );

        expect(result.potentialConclusions).toContain('Therefore, Socrates is mortal');
        expect(result.potentialPremises).toContain('All men are mortal');
      });

      it('should identify premises with indicator words', () => {
        const sentences = ['Since it is raining, the ground will be wet'];
        const result = provider.identifyPremisesAndConclusions(
          sentences,
          sampleConclusionIndicators,
          samplePremiseIndicators
        );

        expect(result.potentialPremises).toContain('Since it is raining, the ground will be wet');
      });

      it('should handle case-insensitive indicator matching', () => {
        const sentences = ['BECAUSE it is true', 'THEREFORE we conclude'];
        const result = provider.identifyPremisesAndConclusions(
          sentences,
          sampleConclusionIndicators,
          samplePremiseIndicators
        );

        expect(result.potentialPremises).toContain('BECAUSE it is true');
        expect(result.potentialConclusions).toContain('THEREFORE we conclude');
      });

      it('should apply position heuristic when no indicators present', () => {
        const sentences = ['First statement', 'Second statement', 'Final statement'];
        const result = provider.identifyPremisesAndConclusions(
          sentences,
          sampleConclusionIndicators,
          samplePremiseIndicators
        );

        expect(result.potentialConclusions).toContain('Final statement');
        expect(result.potentialPremises).toContain('First statement');
        expect(result.potentialPremises).toContain('Second statement');
      });

      it('should prioritize indicator words over position heuristic', () => {
        const sentences = ['Therefore, we conclude this first', 'Because of evidence', 'Final statement'];
        const result = provider.identifyPremisesAndConclusions(
          sentences,
          sampleConclusionIndicators,
          samplePremiseIndicators
        );

        expect(result.potentialConclusions).toContain('Therefore, we conclude this first');
        expect(result.potentialPremises).toContain('Because of evidence');
        expect(result.potentialConclusions).toContain('Final statement'); // Position heuristic for remaining
      });

      it('should handle multiple premises and conclusions', () => {
        const sentences = [
          'Because A is true',
          'Since B is also true', 
          'Therefore C follows',
          'Hence D must be true'
        ];
        const result = provider.identifyPremisesAndConclusions(
          sentences,
          sampleConclusionIndicators,
          samplePremiseIndicators
        );

        expect(result.potentialPremises).toHaveLength(2);
        expect(result.potentialConclusions).toHaveLength(2);
      });
    });

    describe('edge cases', () => {
      it('should handle single sentence arguments', () => {
        const sentences = ['Single sentence argument'];
        const result = provider.identifyPremisesAndConclusions(
          sentences,
          sampleConclusionIndicators,
          samplePremiseIndicators
        );

        // Single sentence should be treated as conclusion by position heuristic
        expect(result.potentialConclusions).toContain('Single sentence argument');
        expect(result.potentialPremises).toHaveLength(0);
      });

      it('should handle empty sentences array', () => {
        const result = provider.identifyPremisesAndConclusions(
          [],
          sampleConclusionIndicators,
          samplePremiseIndicators
        );

        expect(result.potentialPremises).toHaveLength(0);
        expect(result.potentialConclusions).toHaveLength(0);
      });

      it('should handle sentences with partial indicator word matches', () => {
        const sentences = ['Therein lies the problem', 'Foremost among reasons'];
        const result = provider.identifyPremisesAndConclusions(
          sentences,
          sampleConclusionIndicators,
          samplePremiseIndicators
        );

        // Should not match partial words, apply position heuristic instead
        expect(result.potentialPremises).toContain('Therein lies the problem');
        expect(result.potentialConclusions).toContain('Foremost among reasons');
      });

      it('should prefer conclusion indicators over premise indicators', () => {
        const sentences = ['Because therefore we conclude this'];
        const result = provider.identifyPremisesAndConclusions(
          sentences,
          sampleConclusionIndicators,
          samplePremiseIndicators
        );

        // Should identify as conclusion since it's checked first
        expect(result.potentialConclusions).toContain('Because therefore we conclude this');
        expect(result.potentialPremises).toHaveLength(0);
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid sentences array', () => {
        mockValidationHelpers.validateDataArray.mockReturnValueOnce({ isValid: false, error: 'Invalid sentences' });
        mockValidationHelpers.throwIfInvalid.mockImplementation((result) => {
          if (!result.isValid) throw new Error(result.error);
        });

        expect(() => provider.identifyPremisesAndConclusions(
          sampleSentences,
          sampleConclusionIndicators,
          samplePremiseIndicators
        )).toThrow('Invalid sentences');
      });

      it('should throw error for invalid conclusion indicators', () => {
        mockValidationHelpers.validateDataArray
          .mockReturnValueOnce({ isValid: true })
          .mockReturnValueOnce({ isValid: false, error: 'Invalid conclusion indicators' });
        mockValidationHelpers.throwIfInvalid.mockImplementation((result) => {
          if (!result.isValid) throw new Error(result.error);
        });

        expect(() => provider.identifyPremisesAndConclusions(
          sampleSentences,
          sampleConclusionIndicators,
          samplePremiseIndicators
        )).toThrow('Invalid conclusion indicators');
      });

      it('should throw error for invalid premise indicators', () => {
        mockValidationHelpers.validateDataArray
          .mockReturnValueOnce({ isValid: true })
          .mockReturnValueOnce({ isValid: true })
          .mockReturnValueOnce({ isValid: false, error: 'Invalid premise indicators' });
        mockValidationHelpers.throwIfInvalid.mockImplementation((result) => {
          if (!result.isValid) throw new Error(result.error);
        });

        expect(() => provider.identifyPremisesAndConclusions(
          sampleSentences,
          sampleConclusionIndicators,
          samplePremiseIndicators
        )).toThrow('Invalid premise indicators');
      });
    });
  });

  describe('analyzeArgumentStructure', () => {
    describe('happy path', () => {
      it('should analyze simple single sentence argument', () => {
        const argument = 'This is a simple argument.';
        const result = provider.analyzeArgumentStructure(argument);

        expect(result).toContain('### Argument Structure Analysis');
        expect(result).toContain('**Argument Complexity:** 1 sentence(s)');
        expect(result).toContain('**simple argument** contained within a single sentence');
        expect(result).toContain('**Identified Premises:**');
        expect(result).toContain('**Identified Conclusions:**');
      });

      it('should analyze basic two-sentence argument', () => {
        const argument = 'All men are mortal. Socrates is mortal.';
        const result = provider.analyzeArgumentStructure(argument);

        expect(result).toContain('**Argument Complexity:** 2 sentence(s)');
        expect(result).toContain('**basic argument** with premise(s) and conclusion');
      });

      it('should analyze complex multi-sentence argument', () => {
        const argument = 'First premise. Second premise. Third premise. Conclusion follows.';
        const result = provider.analyzeArgumentStructure(argument);

        expect(result).toContain('**Argument Complexity:** 4 sentence(s)');
        expect(result).toContain('**complex argument** with multiple premises');
      });

      it('should identify conditional (if-then) patterns', () => {
        const argument = 'If it rains, then the ground gets wet. Therefore, it will be muddy.';
        const result = provider.analyzeArgumentStructure(argument);

        expect(result).toContain('**conditional (if-then) pattern**');
      });

      it('should identify conditional patterns with just if-therefore', () => {
        const argument = 'If the economy improves, unemployment will decrease. Therefore, people will be happier.';
        const result = provider.analyzeArgumentStructure(argument);

        expect(result).toContain('**conditional (if-then) pattern**');
      });

      it('should identify arguments with multiple conclusions', () => {
        const argument = 'Given the evidence. Therefore, A is true. Hence, B follows.';
        const result = provider.analyzeArgumentStructure(argument);

        expect(result).toContain('**multiple conclusions** or sub-conclusions');
      });

      it('should display identified premises and conclusions', () => {
        const argument = 'Because it is raining, the ground is wet. Therefore, we should stay inside.';
        const result = provider.analyzeArgumentStructure(argument);

        expect(result).toContain('1. Because it is raining, the ground is wet');
        expect(result).toContain('1. Therefore, we should stay inside');
      });

      it('should handle arguments with no clear premises or conclusions', () => {
        const argument = 'Some statement. Another statement.';
        const result = provider.analyzeArgumentStructure(argument);

        expect(result).toContain('1. Some statement');
        expect(result).toContain('1. Another statement');
      });
    });

    describe('edge cases', () => {
      it('should handle arguments with only punctuation variations', () => {
        const argument = 'Statement one! Statement two? Statement three.';
        const result = provider.analyzeArgumentStructure(argument);

        expect(result).toContain('**Argument Complexity:** 3 sentence(s)');
        expect(result).toContain('**complex argument**');
      });

      it('should handle case-insensitive conditional pattern matching', () => {
        const argument = 'IF conditions are met, THEN results follow. THEREFORE conclusion.';
        const result = provider.analyzeArgumentStructure(argument);

        expect(result).toContain('**conditional (if-then) pattern**');
      });

      it('should handle mixed case indicator words', () => {
        const argument = 'BECAUSE evidence exists. THEREFORE conclusion follows.';
        const result = provider.analyzeArgumentStructure(argument);

        expect(result).toContain('1. BECAUSE evidence exists');
        expect(result).toContain('1. THEREFORE conclusion follows');
      });

      it('should handle arguments with no terminal punctuation', () => {
        const argument = 'This is an argument without punctuation';
        const result = provider.analyzeArgumentStructure(argument);

        expect(result).toContain('**Argument Complexity:** 1 sentence(s)');
        expect(result).toContain('**simple argument**');
      });
    });

    describe('error handling', () => {
      it('should throw error for empty string', () => {
        mockValidationHelpers.validateNonEmptyString.mockReturnValue({ isValid: false, error: 'Empty string' });
        mockValidationHelpers.throwIfInvalid.mockImplementation((result) => {
          if (!result.isValid) throw new Error(result.error);
        });

        expect(() => provider.analyzeArgumentStructure('')).toThrow('Empty string');
      });

      it('should throw error for null input', () => {
        mockValidationHelpers.validateNonEmptyString.mockReturnValue({ isValid: false, error: 'Null input' });
        mockValidationHelpers.throwIfInvalid.mockImplementation((result) => {
          if (!result.isValid) throw new Error(result.error);
        });

        expect(() => provider.analyzeArgumentStructure(null as any)).toThrow('Null input');
      });
    });
  });

  describe('performance', () => {
    it('should handle long arguments efficiently', () => {
      const longArgument = 'This is a sentence. '.repeat(100) + 'Therefore, this is the conclusion.';
      
      const startTime = Date.now();
      const result = provider.analyzeArgumentStructure(longArgument);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result).toContain('### Argument Structure Analysis');
      expect(result).toContain('**Argument Complexity:** 101 sentence(s)');
    });

    it('should handle multiple rapid analyses', () => {
      const arguments = [
        'Simple argument.',
        'Premise. Conclusion.',
        'If this, then that. Therefore, result.',
        'Because reason. Hence, conclusion.'
      ];

      const startTime = Date.now();
      const results = arguments.map(arg => provider.analyzeArgumentStructure(arg));
      const endTime = Date.now();

      expect(results).toHaveLength(4);
      expect(endTime - startTime).toBeLessThan(500);
      results.forEach(result => {
        expect(result).toContain('### Argument Structure Analysis');
      });
    });
  });
});