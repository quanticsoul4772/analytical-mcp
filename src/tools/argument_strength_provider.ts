/**
 * Argument Strength Provider
 * 
 * Handles strength analysis of logical arguments including factor detection,
 * causal reasoning analysis, and strength assessment generation.
 */

import { ValidationHelpers } from '../utils/validation_helpers.js';

/**
 * Strength factor interface
 */
export interface StrengthFactor {
  name: string;
  present: boolean;
  evidence: string;
  impact: number;
}

/**
 * Argument Strength Provider Class
 * Analyzes strength factors in logical arguments
 */
export class ArgumentStrengthProvider {

  /**
   * Validates strength analysis inputs
   */
  private validateStrengthAnalysisInputs(argument: string): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(argument));
  }

  /**
   * Creates strength factor detection mapping
   */
  private createStrengthFactorDetectionMapping(): Record<string, (argLower: string) => StrengthFactor> {
    return {
      evidence: (argLower) => {
        const evidenceTerms = /evidence|data|study|research|statistics|survey|experiment|observation|example|case|instance/;
        const hasEvidence = evidenceTerms.test(argLower);
        return {
          name: 'Evidence Support',
          present: hasEvidence,
          evidence: hasEvidence
            ? 'The argument references evidence or supporting information'
            : 'The argument lacks explicit reference to evidence',
          impact: hasEvidence ? 2 : -1,
        };
      },
      quantitative: (argLower) => {
        const quantitativeTerms = /\d+%|\d+ percent|percent|percentage|proportion|ratio|rate|frequency|\d+ of \d+|half|quarter|third/;
        const hasQuantitative = quantitativeTerms.test(argLower);
        return {
          name: 'Quantitative Information',
          present: hasQuantitative,
          evidence: hasQuantitative
            ? 'The argument includes specific quantities or statistics'
            : 'The argument lacks specific quantities or statistics',
          impact: hasQuantitative ? 1 : 0,
        };
      },
      alternatives: (argLower) => {
        const alternativeTerms = /alternative|other explanation|other possibility|could also be|might also|another way|different perspective/;
        const hasAlternatives = alternativeTerms.test(argLower);
        return {
          name: 'Alternative Consideration',
          present: hasAlternatives,
          evidence: hasAlternatives
            ? 'The argument acknowledges alternative explanations or perspectives'
            : "The argument doesn't consider alternative explanations",
          impact: hasAlternatives ? 1 : -1,
        };
      },
      qualifiers: (argLower) => {
        const qualifierTerms = /likely|probably|possibly|suggests|indicates|may|might|could|appears|seems|tends to/;
        const hasQualifiers = qualifierTerms.test(argLower);
        return {
          name: 'Appropriate Certainty',
          present: hasQualifiers,
          evidence: hasQualifiers
            ? 'The argument uses appropriate qualifiers when expressing certainty'
            : 'The argument may express inappropriate certainty',
          impact: hasQualifiers ? 1 : -1,
        };
      },
      consensus: (argLower) => {
        const consensusTerms = /consensus|experts agree|generally accepted|widely recognized|established|according to experts/;
        const hasConsensus = consensusTerms.test(argLower);
        return {
          name: 'Expert Consensus',
          present: hasConsensus,
          evidence: hasConsensus
            ? 'The argument references expert consensus'
            : "The argument doesn't mention expert consensus",
          impact: hasConsensus ? 1 : 0,
        };
      },
      counterarguments: (argLower) => {
        const counterargumentTerms = /critics argue|opponents claim|however|on the other hand|despite this|some argue|counter argument/;
        const hasCounterarguments = counterargumentTerms.test(argLower);
        return {
          name: 'Counterargument Acknowledgment',
          present: hasCounterarguments,
          evidence: hasCounterarguments
            ? 'The argument acknowledges opposing viewpoints'
            : "The argument doesn't address opposing viewpoints",
          impact: hasCounterarguments ? 1 : -1,
        };
      },
    };
  }

  /**
   * Detects causal reasoning issues
   */
  private detectCausalReasoningIssues(argLower: string, hasAlternatives: boolean): StrengthFactor[] {
    const causalTerms = /causes|caused by|lead to|leads to|resulted in|because of|due to|attributed to/;
    const correlationTerms = /correlation|associated with|linked to|connected to/;
    const hasCausal = causalTerms.test(argLower);
    const hasCorrelation = correlationTerms.test(argLower);
    
    const issues: StrengthFactor[] = [];
    
    if (hasCausal && !hasAlternatives) {
      issues.push({
        name: 'Causal Reasoning Issues',
        present: true,
        evidence: 'The argument makes causal claims without considering alternative explanations',
        impact: -2,
      });
    }
    
    if (hasCorrelation && hasCausal) {
      issues.push({
        name: 'Correlation-Causation Confusion',
        present: true,
        evidence: 'The argument may confuse correlation with causation',
        impact: -2,
      });
    }
    
    return issues;
  }

  /**
   * Generates strength assessment from factors
   */
  private generateStrengthAssessment(strengthFactors: StrengthFactor[]): string {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(strengthFactors));
    
    const strengthScore = strengthFactors.reduce((sum, factor) => sum + factor.impact, 0);
    
    let result = '**Strength Assessment:**\n\n';
    
    if (strengthScore >= 3) {
      result += 'The argument demonstrates strong logical foundation with multiple supporting elements.\n\n';
    } else if (strengthScore >= 0) {
      result += 'The argument has adequate logical foundation but could be strengthened with additional elements.\n\n';
    } else {
      result += 'The argument has several weaknesses that significantly impact its persuasive strength.\n\n';
    }
    
    result += '**Strength Factors Analysis:**\n\n';
    result += '| Factor | Present | Impact |\n';
    result += '|--------|---------|--------|\n';
    
    strengthFactors.forEach((factor) => {
      const impactSymbol = factor.impact > 0 ? '➕' : factor.impact < 0 ? '➖' : '⚪';
      const impactText = factor.impact > 0 ? 'Positive' : factor.impact < 0 ? 'Negative' : 'Neutral';
      result += `| ${factor.name} | ${factor.present ? 'Yes' : 'No'} | ${impactSymbol} ${impactText} |\n`;
    });
    
    result += '\n**Factor Details:**\n\n';
    strengthFactors.forEach((factor) => {
      result += `- **${factor.name}**: ${factor.evidence}\n`;
    });
    
    result += '\n';
    return result;
  }

  /**
   * Analyzes argument strength
   */
  analyzeArgumentStrength(argument: string): string {
    // Apply ValidationHelpers early return patterns
    this.validateStrengthAnalysisInputs(argument);
    
    let result = `### Argument Strength\n\n`;
    const argLower = argument.toLowerCase();
    
    // Detect strength factors using mapping pattern
    const factorDetectors = this.createStrengthFactorDetectionMapping();
    const strengthFactors = Object.values(factorDetectors).map(detector => detector(argLower));
    
    // Check if alternatives were detected (needed for causal reasoning check)
    const hasAlternatives = strengthFactors.find(factor => factor.name === 'Alternative Consideration')?.present || false;
    
    // Add causal reasoning issues using focused helper
    const causalIssues = this.detectCausalReasoningIssues(argLower, hasAlternatives);
    strengthFactors.push(...causalIssues);
    
    // Generate assessment using focused helper
    result += this.generateStrengthAssessment(strengthFactors);
    
    return result;
  }

  /**
   * Gets strength factors for an argument
   */
  getStrengthFactors(argument: string): StrengthFactor[] {
    this.validateStrengthAnalysisInputs(argument);
    
    const argLower = argument.toLowerCase();
    const factorDetectors = this.createStrengthFactorDetectionMapping();
    const strengthFactors = Object.values(factorDetectors).map(detector => detector(argLower));
    
    const hasAlternatives = strengthFactors.find(factor => factor.name === 'Alternative Consideration')?.present || false;
    const causalIssues = this.detectCausalReasoningIssues(argLower, hasAlternatives);
    strengthFactors.push(...causalIssues);
    
    return strengthFactors;
  }
}
