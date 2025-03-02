// Import types
import { z } from 'zod';

/**
 * Logical Argument Analyzer Tool
 * Analyzes arguments for logical structure, fallacies, validity, and strength
 */

// Schema for the tool parameters
export const logicalArgumentAnalyzerSchema = z.object({
  argument: z.string().describe('The argument to analyze'),
  analysisType: z
    .enum(['structure', 'fallacies', 'validity', 'strength', 'comprehensive'])
    .default('comprehensive')
    .describe('Type of analysis to perform'),
  includeRecommendations: z
    .boolean()
    .default(true)
    .describe('Include recommendations for improving the argument'),
});

// Types of logical fallacies with descriptions
const fallacyTypes = {
  adHominem: {
    name: 'Ad Hominem',
    description: 'Attacking the person rather than addressing their argument',
    example: "You can't trust his economic policy because he's never worked a real job.",
  },
  strawMan: {
    name: 'Straw Man',
    description: "Misrepresenting someone's argument to make it easier to attack",
    example:
      'She wants environmental regulations, so she obviously wants to destroy all businesses.',
  },
  appealToAuthority: {
    name: 'Appeal to Authority',
    description: "Using an authority's opinion as evidence without addressing the argument itself",
    example: 'Dr. Smith believes in this treatment, so it must be effective.',
  },
  falseEquivalence: {
    name: 'False Equivalence',
    description: "Comparing two things that aren't comparable",
    example: 'Making children eat vegetables is the same as dictatorial control.',
  },
  slipperySlope: {
    name: 'Slippery Slope',
    description: 'Asserting that a small step will lead to a chain of events without evidence',
    example: 'If we allow same-sex marriage, next people will want to marry their pets.',
  },
  circularReasoning: {
    name: 'Circular Reasoning',
    description: 'Making an argument where the conclusion is included in the premise',
    example:
      "The Bible is true because it's the word of God, and we know it's the word of God because the Bible says so.",
  },
  falseDichotomy: {
    name: 'False Dichotomy',
    description: 'Presenting only two options when more exist',
    example: 'Either we cut all environmental regulations or we lose all our jobs.',
  },
  hastyGeneralization: {
    name: 'Hasty Generalization',
    description: 'Drawing a conclusion based on insufficient evidence',
    example: 'I met two rude people from that country, so everyone from there must be rude.',
  },
  appealToEmotion: {
    name: 'Appeal to Emotion',
    description: 'Manipulating emotions rather than using valid reasoning',
    example: 'Think of the children! We must pass this law to protect them.',
  },
  redHerring: {
    name: 'Red Herring',
    description: 'Introducing an irrelevant topic to divert attention',
    example:
      'Why worry about climate change when there are children starving in developing countries?',
  },
};

// Tool implementation
export async function logicalArgumentAnalyzer(
  argument: string,
  analysisType: string = 'comprehensive',
  includeRecommendations: boolean = true
): Promise<string> {
  // Validate inputs
  if (!argument || argument.trim().length === 0) {
    throw new Error('An argument must be provided for analysis');
  }

  // Determine which analyses to perform
  const analyzeStructure = analysisType === 'structure' || analysisType === 'comprehensive';
  const analyzeFallacies = analysisType === 'fallacies' || analysisType === 'comprehensive';
  const analyzeValidity = analysisType === 'validity' || analysisType === 'comprehensive';
  const analyzeStrength = analysisType === 'strength' || analysisType === 'comprehensive';

  // Build the result
  let result = `## Logical Argument Analysis\n\n`;

  // Add the argument text for reference
  result += `### Argument Text\n\n${argument}\n\n`;

  // Analyze argument structure
  if (analyzeStructure) {
    result += analyzeArgumentStructure(argument);
  }

  // Analyze logical fallacies
  if (analyzeFallacies) {
    result += analyzeLogicalFallacies(argument);
  }

  // Analyze argument validity
  if (analyzeValidity) {
    result += analyzeArgumentValidity(argument);
  }

  // Analyze argument strength
  if (analyzeStrength) {
    result += analyzeArgumentStrength(argument);
  }

  // Add recommendations if requested
  if (includeRecommendations) {
    result += generateArgumentRecommendations(argument, analysisType);
  }

  return result;
}

// Function to analyze argument structure
function analyzeArgumentStructure(argument: string): string {
  let result = `### Argument Structure\n\n`;

  // Basic analysis of argument structure
  const sentenceCount = argument.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const sentences = argument
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());

  // Extract potential premises and conclusions
  const conclusionIndicators = [
    'therefore',
    'thus',
    'hence',
    'consequently',
    'so',
    'it follows that',
    'as a result',
    'which means that',
  ];
  const premiseIndicators = [
    'because',
    'since',
    'as',
    'given that',
    'assuming that',
    'for',
    'considering that',
  ];

  const potentialPremises: string[] = [];
  const potentialConclusions: string[] = [];

  // Attempt to identify premises and conclusions by indicator words
  for (const sentence of sentences) {
    let isConclusion = false;
    let isPremise = false;

    for (const indicator of conclusionIndicators) {
      if (sentence.toLowerCase().includes(indicator)) {
        potentialConclusions.push(sentence);
        isConclusion = true;
        break;
      }
    }

    if (!isConclusion) {
      for (const indicator of premiseIndicators) {
        if (sentence.toLowerCase().includes(indicator)) {
          potentialPremises.push(sentence);
          isPremise = true;
          break;
        }
      }
    }

    if (!isConclusion && !isPremise) {
      // If no indicators are found, use heuristics
      if (sentence === sentences[sentences.length - 1]) {
        // Last sentence is often a conclusion
        potentialConclusions.push(sentence);
      } else {
        // Default to treating as a premise
        potentialPremises.push(sentence);
      }
    }
  }

  // Analyze argument structure
  if (potentialPremises.length === 0) {
    result +=
      'This appears to be a **conclusion-only statement** without supporting premises. A strong argument requires premises to support the conclusion.\n\n';
  } else if (potentialConclusions.length === 0) {
    result +=
      'This appears to be a **set of premises** without a clear conclusion. A complete argument requires a conclusion that follows from the premises.\n\n';
  } else {
    if (potentialPremises.length === 1) {
      result +=
        'This is a **simple argument** with a single premise supporting the conclusion.\n\n';
    } else {
      result +=
        'This is a **complex argument** with multiple premises supporting the conclusion.\n\n';
    }

    // Identify argument pattern
    if (
      argument.toLowerCase().includes('if') &&
      (argument.toLowerCase().includes('then') || argument.toLowerCase().includes('therefore'))
    ) {
      result += 'The argument follows a **conditional (if-then) pattern**.\n\n';
    } else if (potentialConclusions.length > 1) {
      result += 'The argument has **multiple conclusions** or sub-conclusions.\n\n';
    }
  }

  // Display identified premises and conclusions
  result += '**Identified Premises:**\n';
  if (potentialPremises.length > 0) {
    potentialPremises.forEach((premise, index) => {
      result += `${index + 1}. ${premise}\n`;
    });
  } else {
    result += 'No clear premises identified.\n';
  }

  result += '\n**Identified Conclusions:**\n';
  if (potentialConclusions.length > 0) {
    potentialConclusions.forEach((conclusion, index) => {
      result += `${index + 1}. ${conclusion}\n`;
    });
  } else {
    result += 'No clear conclusion identified.\n';
  }

  result += '\n';
  return result;
}

// Function to analyze logical fallacies
function analyzeLogicalFallacies(argument: string): string {
  let result = `### Logical Fallacy Analysis\n\n`;

  // Simplistic detection of potential fallacies based on keywords and patterns
  const detectedFallacies: {
    name: string;
    description: string;
    evidence: string;
    confidence: number;
  }[] = [];

  const lowerArg = argument.toLowerCase();

  // Ad Hominem detection
  if (
    /they are|he is|she is|you are|they're|he's|she's|you're/.test(lowerArg) &&
    /stupid|dumb|idiot|fool|incompetent|ignorant|uneducated|inexperienced/.test(lowerArg)
  ) {
    detectedFallacies.push({
      name: fallacyTypes.adHominem.name,
      description: fallacyTypes.adHominem.description,
      evidence:
        'The argument appears to attack personal characteristics rather than addressing the substance of the opposing position.',
      confidence: 0.7,
    });
  }

  // Straw Man detection
  if (
    /(no one|nobody) is saying|claiming|suggesting/.test(lowerArg) ||
    /that's not what|that isn't what|misrepresent/.test(lowerArg)
  ) {
    detectedFallacies.push({
      name: fallacyTypes.strawMan.name,
      description: fallacyTypes.strawMan.description,
      evidence:
        "The argument may be refuting a position that wasn't actually presented by the opposition.",
      confidence: 0.6,
    });
  }

  // Appeal to Authority detection
  if (
    /expert|authority|professor|doctor|scientist|research|study|according to/.test(lowerArg) &&
    !/evidence|data|experiment|finding/.test(lowerArg)
  ) {
    detectedFallacies.push({
      name: fallacyTypes.appealToAuthority.name,
      description: fallacyTypes.appealToAuthority.description,
      evidence:
        'The argument relies on authority figures without discussing the substance of their findings or the evidence they present.',
      confidence: 0.5,
    });
  }

  // Slippery Slope detection
  if (
    /next|then|lead to|result in|eventually|ultimately|soon|before you know it/.test(lowerArg) &&
    /will|would|could|might|may|can/.test(lowerArg)
  ) {
    detectedFallacies.push({
      name: fallacyTypes.slipperySlope.name,
      description: fallacyTypes.slipperySlope.description,
      evidence:
        'The argument suggests that one event will lead to a series of negative consequences without providing evidence for this chain of events.',
      confidence: 0.6,
    });
  }

  // False Dichotomy detection
  if (
    /either|or|only two|only choice|there is no other|no middle ground|one or the other/.test(
      lowerArg
    )
  ) {
    detectedFallacies.push({
      name: fallacyTypes.falseDichotomy.name,
      description: fallacyTypes.falseDichotomy.description,
      evidence: 'The argument presents only two options when more alternatives may exist.',
      confidence: 0.7,
    });
  }

  // Appeal to Emotion detection
  if (
    /think about|imagine|consider|feel|children|family|future generations|tragedy|disaster|catastrophe|horrific|terrible/.test(
      lowerArg
    )
  ) {
    detectedFallacies.push({
      name: fallacyTypes.appealToEmotion.name,
      description: fallacyTypes.appealToEmotion.description,
      evidence:
        'The argument appeals to emotions rather than providing logical reasoning or evidence.',
      confidence: 0.5,
    });
  }

  // Report detected fallacies
  if (detectedFallacies.length === 0) {
    result +=
      "No common logical fallacies were detected in this argument. However, fallacy detection is complex and the absence of detection doesn't guarantee a fallacy-free argument.\n\n";
  } else {
    result += `**Potential Logical Fallacies Detected:**\n\n`;

    detectedFallacies.forEach((fallacy, index) => {
      result += `${index + 1}. **${fallacy.name}** (Confidence: ${(fallacy.confidence * 100).toFixed(0)}%)  \n`;
      result += `   *${fallacy.description}*  \n`;
      result += `   Evidence: ${fallacy.evidence}\n\n`;
    });

    result +=
      'Note: Fallacy detection is based on text patterns and may not accurately capture the nuance of the argument. These are potential fallacies that should be evaluated in context.\n\n';
  }

  return result;
}

// Function to analyze argument validity
function analyzeArgumentValidity(argument: string): string {
  let result = `### Argument Validity\n\n`;

  // This is a simplified analysis and should be expanded with more sophisticated logic in a real implementation

  // Check for basic validity patterns
  const sentences = argument
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());
  const argLower = argument.toLowerCase();

  // Check for conditional reasoning patterns
  const hasConditional = /if.*then|when.*then|unless.*then|given.*it follows|since.*therefore/.test(
    argLower
  );

  // Check for logical connectors
  const hasPremiseConnectors = /because|since|as|given that|for|considering that/.test(argLower);
  const hasConclusionConnectors =
    /therefore|thus|hence|consequently|so|it follows that|as a result/.test(argLower);

  // Check for claim support patterns
  const hasEvidenceTerms =
    /evidence|data|study|research|statistics|example|survey|experiment|observation/.test(argLower);

  // Create a validity assessment based on these patterns
  let validityScore = 0;
  let validityAssessment = '';

  if (hasConditional) {
    validityScore += 2;
    validityAssessment +=
      '- The argument uses conditional reasoning (if-then structure), which is a valid logical form when properly applied.\n';
  }

  if (hasPremiseConnectors && hasConclusionConnectors) {
    validityScore += 2;
    validityAssessment +=
      '- The argument clearly distinguishes premises from conclusions using appropriate connectors.\n';
  } else if (hasPremiseConnectors || hasConclusionConnectors) {
    validityScore += 1;
    validityAssessment +=
      '- The argument uses some logical connectors, but could be more explicit in distinguishing premises from conclusions.\n';
  } else {
    validityAssessment +=
      '- The argument lacks clear logical connectors to distinguish premises from conclusions.\n';
  }

  if (hasEvidenceTerms) {
    validityScore += 1;
    validityAssessment +=
      '- The argument references evidence or supporting information, which strengthens its logical foundation.\n';
  } else {
    validityAssessment +=
      '- The argument may lack explicit reference to evidence or supporting information.\n';
  }

  // Evaluate circular reasoning
  if (sentences.length >= 2) {
    const firstSentence = sentences[0].toLowerCase();
    const lastSentence = sentences[sentences.length - 1].toLowerCase();

    // Very simplistic check for similar content at beginning and end
    const similarWords = firstSentence
      .split(/\s+/)
      .filter((word) => lastSentence.split(/\s+/).includes(word) && word.length > 3);

    if (similarWords.length >= 3) {
      validityScore -= 2;
      validityAssessment +=
        '- The argument may contain circular reasoning, as the conclusion appears to restate the premise.\n';
    }
  }

  // Generate overall validity assessment
  result += '**Validity Assessment:**\n\n';

  if (validityScore >= 3) {
    result +=
      'The argument appears to follow valid logical structure with clear premises leading to conclusions.\n\n';
  } else if (validityScore >= 1) {
    result +=
      'The argument has some elements of valid logical structure but could be improved for clarity and coherence.\n\n';
  } else {
    result +=
      'The argument may have significant logical structure issues that affect its validity.\n\n';
  }

  result += validityAssessment + '\n';

  result +=
    "**Note:** This is a preliminary assessment of logical structure and doesn't evaluate the factual accuracy of premises or the strength of inference.\n\n";

  return result;
}

// Function to analyze argument strength
function analyzeArgumentStrength(argument: string): string {
  let result = `### Argument Strength\n\n`;

  // Argument strength factors
  const strengthFactors: {
    name: string;
    present: boolean;
    evidence: string;
    impact: number; // -2 to +2 scale
  }[] = [];

  const argLower = argument.toLowerCase();

  // Check for evidence
  const evidenceTerms =
    /evidence|data|study|research|statistics|survey|experiment|observation|example|case|instance/;
  const hasEvidence = evidenceTerms.test(argLower);
  strengthFactors.push({
    name: 'Evidence Support',
    present: hasEvidence,
    evidence: hasEvidence
      ? 'The argument references evidence or supporting information'
      : 'The argument lacks explicit reference to evidence',
    impact: hasEvidence ? 2 : -1,
  });

  // Check for quantitative information
  const quantitativeTerms =
    /\d+%|\d+ percent|percent|percentage|proportion|ratio|rate|frequency|\d+ of \d+|half|quarter|third/;
  const hasQuantitative = quantitativeTerms.test(argLower);
  strengthFactors.push({
    name: 'Quantitative Information',
    present: hasQuantitative,
    evidence: hasQuantitative
      ? 'The argument includes specific quantities or statistics'
      : 'The argument lacks specific quantities or statistics',
    impact: hasQuantitative ? 1 : 0,
  });

  // Check for considerations of alternative explanations
  const alternativeTerms =
    /alternative|other explanation|other possibility|could also be|might also|another way|different perspective/;
  const hasAlternatives = alternativeTerms.test(argLower);
  strengthFactors.push({
    name: 'Alternative Consideration',
    present: hasAlternatives,
    evidence: hasAlternatives
      ? 'The argument acknowledges alternative explanations or perspectives'
      : "The argument doesn't consider alternative explanations",
    impact: hasAlternatives ? 1 : -1,
  });

  // Check for qualifiers showing appropriate certainty
  const qualifierTerms =
    /likely|probably|possibly|suggests|indicates|may|might|could|appears|seems|tends to/;
  const hasQualifiers = qualifierTerms.test(argLower);
  strengthFactors.push({
    name: 'Appropriate Certainty',
    present: hasQualifiers,
    evidence: hasQualifiers
      ? 'The argument uses appropriate qualifiers when expressing certainty'
      : 'The argument may express inappropriate certainty',
    impact: hasQualifiers ? 1 : -1,
  });

  // Check for expert consensus
  const consensusTerms =
    /consensus|experts agree|generally accepted|widely recognized|established|according to experts/;
  const hasConsensus = consensusTerms.test(argLower);
  strengthFactors.push({
    name: 'Expert Consensus',
    present: hasConsensus,
    evidence: hasConsensus
      ? 'The argument references expert consensus'
      : "The argument doesn't mention expert consensus",
    impact: hasConsensus ? 1 : 0,
  });

  // Check for addressing counterarguments
  const counterargumentTerms =
    /objection|criticism|counter-argument|counterargument|opponents argue|some might say|critics suggest|contrary view/;
  const hasCounterarguments = counterargumentTerms.test(argLower);
  strengthFactors.push({
    name: 'Counterargument Consideration',
    present: hasCounterarguments,
    evidence: hasCounterarguments
      ? 'The argument addresses potential counterarguments'
      : "The argument doesn't address potential counterarguments",
    impact: hasCounterarguments ? 2 : -1,
  });

  // Check for causal reasoning problems
  const causalTerms =
    /causes|caused by|lead to|leads to|resulted in|because of|due to|attributed to/;
  const correlationTerms = /correlation|associated with|linked to|connected to/;
  const hasCausal = causalTerms.test(argLower);
  const hasCorrelation = correlationTerms.test(argLower);

  if (hasCausal && !hasAlternatives) {
    strengthFactors.push({
      name: 'Causal Reasoning Issues',
      present: true,
      evidence: 'The argument makes causal claims without considering alternative explanations',
      impact: -2,
    });
  }

  if (hasCorrelation && hasCausal) {
    strengthFactors.push({
      name: 'Correlation-Causation Confusion',
      present: true,
      evidence: 'The argument may confuse correlation with causation',
      impact: -2,
    });
  }

  // Calculate overall strength score (-10 to 10 scale)
  const strengthScore = strengthFactors.reduce((sum, factor) => sum + factor.impact, 0);

  // Generate strength assessment
  result += '**Strength Assessment:**\n\n';

  if (strengthScore >= 5) {
    result +=
      'This appears to be a **strong argument** with substantial support and logical coherence.\n\n';
  } else if (strengthScore >= 1) {
    result +=
      'This appears to be a **moderately strong argument** with some supporting elements but room for improvement.\n\n';
  } else if (strengthScore >= -4) {
    result +=
      'This appears to be a **weak argument** with significant gaps in reasoning or support.\n\n';
  } else {
    result +=
      'This appears to be a **very weak argument** with major logical flaws or lack of support.\n\n';
  }

  // Add strength factors table
  result += '**Strength Factors:**\n\n';
  result += '| Factor | Present | Impact |\n';
  result += '| ------ | ------- | ------ |\n';

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

// Function to generate recommendations for improving the argument
function generateArgumentRecommendations(argument: string, analysisType: string): string {
  let result = `### Recommendations for Improvement\n\n`;

  // Extract simple features from the argument to inform recommendations
  const argLower = argument.toLowerCase();
  const sentenceCount = argument.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;

  const hasEvidence = /evidence|data|study|research|statistics|survey|experiment|observation/.test(
    argLower
  );
  const hasLogicalConnectors = /because|since|therefore|thus|hence|consequently/.test(argLower);
  const hasQualifiers = /likely|probably|possibly|suggests|indicates|may|might|could/.test(
    argLower
  );
  const hasCounterarguments =
    /objection|criticism|counter-argument|counterargument|opponents argue|some might say/.test(
      argLower
    );
  const hasAlternatives =
    /alternative|other explanation|other possibility|could also be|might also/.test(argLower);

  // Generate tailored recommendations based on what the argument is missing
  const recommendations: string[] = [];

  // Structure recommendations
  if (!hasLogicalConnectors) {
    recommendations.push(
      "**Clarify Logical Structure**: Use logical connectors like 'because,' 'since,' 'therefore,' or 'thus' to clearly distinguish premises from conclusions and show the flow of reasoning."
    );
  }

  if (sentenceCount < 3) {
    recommendations.push(
      '**Develop the Argument**: Expand your argument by providing more premises that support your conclusion. A well-developed argument typically includes multiple supporting points.'
    );
  }

  // Evidence recommendations
  if (!hasEvidence) {
    recommendations.push(
      '**Add Supporting Evidence**: Strengthen your argument by including specific evidence, data, or examples that support your premises. Concrete evidence makes your argument more persuasive.'
    );
  }

  // Logical balance recommendations
  if (!hasQualifiers) {
    recommendations.push(
      "**Use Appropriate Qualifiers**: Consider adding qualifying language (e.g., 'likely,' 'probably,' 'suggests') when appropriate to avoid overstating certainty beyond what your evidence supports."
    );
  }

  if (!hasCounterarguments) {
    recommendations.push(
      '**Address Counterarguments**: Strengthen your argument by acknowledging potential objections and explaining why your conclusion still holds despite these challenges.'
    );
  }

  if (!hasAlternatives) {
    recommendations.push(
      '**Consider Alternatives**: When making causal claims or proposing explanations, consider alternative possibilities and explain why your preferred explanation is more plausible.'
    );
  }

  // If all common elements are present, add general improvement recommendations
  if (recommendations.length === 0) {
    recommendations.push(
      '**Further Strengthen Evidence**: While your argument includes evidence, consider adding more specific, quantitative, or authoritative sources to bolster your case.'
    );
    recommendations.push(
      '**Refine Logical Connections**: Even though your argument has a clear structure, you might further clarify how each premise specifically supports the conclusion.'
    );
    recommendations.push(
      '**Expand Counterargument Consideration**: Build on your existing counterargument treatment by addressing the strongest possible objections to your position.'
    );
  }

  // Add the recommendations to the result
  if (recommendations.length > 0) {
    recommendations.forEach((rec, index) => {
      result += `${index + 1}. ${rec}\n\n`;
    });
  }

  return result;
}
