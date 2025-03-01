import { z } from "zod";

// Schema for the tool parameters
export const logicalFallacyDetectorSchema = z.object({
  text: z.string().describe("The text to analyze for logical fallacies"),
  confidenceThreshold: z.number().min(0).max(1).default(0.5).describe("Minimum confidence level to report a fallacy (0-1)"),
  includeExplanations: z.boolean().default(true).describe("Include detailed explanations for detected fallacies"),
  includeExamples: z.boolean().default(true).describe("Include examples of how to correct each fallacy"),
  fallacyCategories: z.array(z.enum([
    "formal", 
    "informal", 
    "relevance", 
    "clarity", 
    "all"
  ])).default(["all"]).describe("Categories of fallacies to detect")
});

// Fallacy definition type
type FallacyDefinition = {
  name: string;
  category: string;
  description: string;
  signals: RegExp[];
  counterExample: string;
  fixExample: string;
};

// Detected fallacy type
type DetectedFallacy = {
  name: string;
  category: string;
  description: string;
  excerpt: string;
  confidence: number;
  counterExample: string;
  fixExample: string;
};

// Tool implementation
export async function logicalFallacyDetector(
  text: string,
  confidenceThreshold: number = 0.5,
  includeExplanations: boolean = true,
  includeExamples: boolean = true,
  fallacyCategories: string[] = ["all"]
): Promise<string> {
  // Validate inputs
  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }
  
  if (confidenceThreshold < 0 || confidenceThreshold > 1) {
    throw new Error("Confidence threshold must be between 0 and 1");
  }
  
  // Normalize the text for analysis
  const normalizedText = text.toLowerCase();
  
  // Filter fallacy categories if not "all"
  let categoriesToCheck = fallacyCategories;
  if (fallacyCategories.includes("all")) {
    categoriesToCheck = ["formal", "informal", "relevance", "clarity"];
  }
  
  // Detect fallacies
  const detectedFallacies = detectFallacies(normalizedText, text, categoriesToCheck, confidenceThreshold);
  
  // Generate result
  let result = `## Logical Fallacy Analysis\n\n`;
  
  if (detectedFallacies.length === 0) {
    result += `No logical fallacies were detected above the confidence threshold (${confidenceThreshold * 100}%).\n\n`;
    result += `This doesn't guarantee the argument is completely free from logical errors, but it passes the automated checks.\n`;
    return result;
  }
  
  result += `**Text Analyzed:**\n\n> ${text}\n\n`;
  result += `**Fallacies Detected:** ${detectedFallacies.length}\n\n`;
  
  // Group fallacies by category
  const categorizedFallacies: Record<string, DetectedFallacy[]> = {};
  
  detectedFallacies.forEach(fallacy => {
    if (!categorizedFallacies[fallacy.category]) {
      categorizedFallacies[fallacy.category] = [];
    }
    categorizedFallacies[fallacy.category].push(fallacy);
  });
  
  // Generate report for each category
  for (const category in categorizedFallacies) {
    result += `### ${formatCategoryName(category)} Fallacies\n\n`;
    
    categorizedFallacies[category].forEach(fallacy => {
      result += `#### ${fallacy.name} (${(fallacy.confidence * 100).toFixed(0)}% confidence)\n\n`;
      
      if (includeExplanations) {
        result += `**Description:** ${fallacy.description}\n\n`;
      }
      
      result += `**Excerpt:** "${fallacy.excerpt}"\n\n`;
      
      if (includeExamples) {
        result += `**Counter-Example:** ${fallacy.counterExample}\n\n`;
        result += `**How to Fix:** ${fallacy.fixExample}\n\n`;
      }
    });
  }
  
  // Add overall assessment
  result += `### Overall Assessment\n\n`;
  
  const highConfidenceFallacies = detectedFallacies.filter(f => f.confidence >= 0.7);
  if (highConfidenceFallacies.length > 0) {
    result += `The text contains ${highConfidenceFallacies.length} high-confidence fallacies that significantly weaken the argument.\n\n`;
    result += `Primary concerns: ${highConfidenceFallacies.map(f => f.name).join(', ')}.\n\n`;
  } else {
    result += `The text contains potential fallacies, but none with high confidence.\n\n`;
  }
  
  // Add suggestions
  result += `### Suggestions for Improvement\n\n`;
  
  detectedFallacies.forEach(fallacy => {
    result += `- **${fallacy.name}:** ${getSuggestionForFallacy(fallacy.name)}\n`;
  });
  
  return result;
}

// Helper function to detect fallacies
function detectFallacies(
  normalizedText: string,
  originalText: string,
  categories: string[],
  confidenceThreshold: number
): DetectedFallacy[] {
  const fallacyDefinitions = getFallacyDefinitions().filter(
    fallacy => categories.includes(fallacy.category)
  );
  
  const detectedFallacies: DetectedFallacy[] = [];
  
  // Split text into sentences for better context
  const sentences = originalText.split(/[.!?]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  const normalizedSentences = normalizedText.split(/[.!?]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // Check each fallacy definition
  fallacyDefinitions.forEach(fallacy => {
    let highestConfidence = 0;
    let bestExcerpt = "";
    
    // Check each sentence for signals
    normalizedSentences.forEach((normalizedSentence, index) => {
      const originalSentence = sentences[index];
      
      // Skip very short sentences
      if (normalizedSentence.length < 5) {
        return;
      }
      
      // Calculate confidence based on signal matches
      let confidenceForSentence = 0;
      
      fallacy.signals.forEach(signal => {
        if (signal.test(normalizedSentence)) {
          confidenceForSentence += 0.3; // Add confidence for each matching signal
        }
      });
      
      // Apply additional confidence adjustments based on heuristics
      if (containsSpecificIndicators(normalizedSentence, fallacy.name)) {
        confidenceForSentence += 0.2;
      }
      
      // Cap confidence at 0.95
      confidenceForSentence = Math.min(0.95, confidenceForSentence);
      
      // Track highest confidence and excerpt
      if (confidenceForSentence > highestConfidence) {
        highestConfidence = confidenceForSentence;
        bestExcerpt = originalSentence;
      }
    });
    
    // Add fallacy if confidence exceeds threshold
    if (highestConfidence >= confidenceThreshold) {
      detectedFallacies.push({
        name: fallacy.name,
        category: fallacy.category,
        description: fallacy.description,
        excerpt: bestExcerpt,
        confidence: highestConfidence,
        counterExample: fallacy.counterExample,
        fixExample: fallacy.fixExample
      });
    }
  });
  
  // Sort by confidence, highest first
  return detectedFallacies.sort((a, b) => b.confidence - a.confidence);
}

// Helper function to check for specific indicators of each fallacy
function containsSpecificIndicators(text: string, fallacyName: string): boolean {
  switch (fallacyName) {
    case "Ad Hominem":
      return /\b(stupid|idiot|dumb|ignorant|fool)\b/.test(text);
      
    case "Appeal to Authority":
      return /\b(expert|authority|scientist|doctor|professor)\s+says\b/.test(text);
      
    case "Straw Man":
      return /\b(trying to say|claiming that|believes that|arguing that)\b/.test(text);
      
    case "False Dichotomy":
      return /\b(either|or|only two choices|only two options)\b/.test(text);
      
    case "Slippery Slope":
      return /\b(lead to|result in|cascade|domino effect|next thing|eventually)\b/.test(text);
      
    case "Hasty Generalization":
      return /\b(all|every|always|never)\b/.test(text) && text.length < 100;
      
    case "Post Hoc Ergo Propter Hoc":
      return /\b(because|after|following|since)\b/.test(text) && /\b(therefore|caused|result)\b/.test(text);
      
    case "Appeal to Emotion":
      return /\b(fear|scary|terrifying|heartbreaking|sad|tragic|outrageous)\b/.test(text);
      
    case "Tu Quoque":
      return /\b(you also|you too|yourself|hypocrite)\b/.test(text);
      
    case "Bandwagon":
      return /\b(everyone|everybody|popular|majority|most people)\b/.test(text);
      
    case "Genetic Fallacy":
      return /\b(comes from|originated|source|background)\b/.test(text);
      
    case "Circular Reasoning":
      return text.split(/\s+/).length < 15 && new Set(text.split(/\s+/)).size < 10;
      
    default:
      return false;
  }
}

// Helper function to format category name
function formatCategoryName(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// Helper function to get suggestion for fallacy
function getSuggestionForFallacy(fallacyName: string): string {
  switch (fallacyName) {
    case "Ad Hominem":
      return "Focus on addressing the argument rather than attacking the person making it.";
      
    case "Appeal to Authority":
      return "Provide additional evidence beyond just citing an authority figure.";
      
    case "Straw Man":
      return "Ensure you are accurately representing the opposing view before critiquing it.";
      
    case "False Dichotomy":
      return "Consider additional alternatives beyond the two options presented.";
      
    case "Slippery Slope":
      return "Demonstrate each step in the causal chain with evidence rather than assuming an inevitable progression.";
      
    case "Hasty Generalization":
      return "Provide more examples or evidence before making broad generalizations.";
      
    case "Post Hoc Ergo Propter Hoc":
      return "Demonstrate a causal mechanism rather than assuming causation from sequence or correlation.";
      
    case "Appeal to Emotion":
      return "Support your argument with facts and reason in addition to emotional appeals.";
      
    case "Tu Quoque":
      return "Address the argument on its merits rather than pointing out hypocrisy or inconsistency.";
      
    case "Bandwagon":
      return "Provide reasons why something is correct beyond its popularity.";
      
    case "Genetic Fallacy":
      return "Evaluate the argument on its merits rather than its origin.";
      
    case "Circular Reasoning":
      return "Ensure your premises are independent from your conclusion.";
      
    case "Equivocation":
      return "Use consistent definitions for key terms throughout your argument.";
      
    case "Non Sequitur":
      return "Clarify how your premises logically lead to your conclusion.";
      
    case "Red Herring":
      return "Stay focused on the main issue rather than introducing tangential topics.";
      
    case "Appeal to Ignorance":
      return "Absence of evidence is not evidence of absence - provide positive evidence for claims.";
      
    case "No True Scotsman":
      return "Avoid redefining terms to exclude counterexamples.";
      
    default:
      return "Ensure your argument follows logical principles and is supported by relevant evidence.";
  }
}

// Helper function to get fallacy definitions
function getFallacyDefinitions(): FallacyDefinition[] {
  return [
    // Formal Fallacies
    {
      name: "Affirming the Consequent",
      category: "formal",
      description: "Taking a true conditional statement and invalidly inferring its converse (If P then Q; Q; therefore P)",
      signals: [
        /if\s+[\w\s]+\s+then\s+[\w\s]+/i,
        /therefore/i,
        /must be/i,
        /implies that/i
      ],
      counterExample: "If it's raining, the ground is wet. The ground is wet, therefore it's raining. (Invalid because the ground could be wet for other reasons.)",
      fixExample: "Specify alternative causes: 'The ground is wet. While rain could cause this, so could a sprinkler, spilled water, or morning dew. We need more evidence to determine the cause.'"
    },
    {
      name: "Denying the Antecedent",
      category: "formal",
      description: "Taking a true conditional statement and invalidly inferring the inverse (If P then Q; not P; therefore not Q)",
      signals: [
        /if\s+[\w\s]+\s+then\s+[\w\s]+/i,
        /not/i,
        /isn't/i,
        /doesn't/i,
        /therefore/i
      ],
      counterExample: "If you study hard, you'll pass the exam. You didn't study hard, therefore you won't pass the exam. (Invalid because you might pass for other reasons.)",
      fixExample: "Acknowledge other factors: 'You didn't study hard, which reduces your chances of passing, but other factors like prior knowledge or test difficulty will also affect the outcome.'"
    },
    
    // Informal Fallacies - Relevance
    {
      name: "Ad Hominem",
      category: "relevance",
      description: "Attacking the person making the argument rather than addressing the argument itself",
      signals: [
        /stupid/i,
        /idiot/i,
        /fool/i,
        /ignorant/i,
        /doesn't know/i,
        /has no idea/i,
        /biased/i
      ],
      counterExample: "Don't listen to her argument about climate policy; she's just a paid shill for the oil industry.",
      fixExample: "Address the argument: 'Let's evaluate her climate policy argument based on its merits, examining the evidence and reasoning presented rather than focusing on who is making it.'"
    },
    {
      name: "Appeal to Authority",
      category: "relevance",
      description: "Using the opinion of an authority figure as evidence in an argument without additional support",
      signals: [
        /expert/i,
        /authority/i,
        /scientist/i,
        /doctor/i,
        /professor/i,
        /says/i,
        /according to/i
      ],
      counterExample: "Dr. Smith says this supplement works, so it must be effective.",
      fixExample: "Seek empirical evidence: 'While Dr. Smith endorses this supplement, let's look at peer-reviewed clinical trials that measure its effectiveness compared to placebo.'"
    },
    {
      name: "Appeal to Emotion",
      category: "relevance",
      description: "Manipulating emotions to win an argument rather than using logic and reason",
      signals: [
        /fear/i,
        /scary/i,
        /terrifying/i,
        /heartbreaking/i,
        /sad/i,
        /tragic/i,
        /think of the children/i
      ],
      counterExample: "Think about the suffering children! You must support this policy.",
      fixExample: "Add factual support: 'This policy would help reduce child poverty by an estimated 20% according to economic models, addressing a significant social problem with measurable benefits.'"
    },
    {
      name: "Tu Quoque",
      category: "relevance",
      description: "Avoiding having to engage with criticism by turning it back on the accuser (the 'you too' fallacy)",
      signals: [
        /you also/i,
        /you too/i,
        /yourself/i,
        /hypocrite/i,
        /practice what you preach/i
      ],
      counterExample: "You say I should quit smoking, but you used to smoke too!",
      fixExample: "Acknowledge the argument's merits: 'While you've had your own struggles with smoking, the health advice about quitting is still valid regardless of your personal history.'"
    },
    
    // Informal Fallacies - Clarity/Ambiguity
    {
      name: "Equivocation",
      category: "clarity",
      description: "Using a term with more than one meaning in a misleading way, shifting between meanings",
      signals: [
        /technically/i,
        /in a sense/i,
        /means/i,
        /defined as/i
      ],
      counterExample: "A bird in the hand is worth two in the bush, so I should keep this cash rather than investing it.",
      fixExample: "Clarify terms: 'While the proverb about birds uses "worth" metaphorically to mean certainty, financial "worth" involves different considerations like growth potential.'"
    },
    {
      name: "Straw Man",
      category: "clarity",
      description: "Misrepresenting an opponent's argument to make it easier to attack",
      signals: [
        /trying to say/i,
        /claiming that/i,
        /believes that/i,
        /arguing that/i,
        /what you're saying is/i
      ],
      counterExample: "You want to improve public healthcare? So you think the government should control every aspect of our lives?",
      fixExample: "Represent views accurately: 'You propose improving public healthcare, which means expanding certain government services in the medical sector, not government control of every aspect of our lives.'"
    },
    
    // Informal Fallacies - Weak Induction
    {
      name: "Hasty Generalization",
      category: "informal",
      description: "Drawing a general conclusion from a sample that is too small or biased",
      signals: [
        /all/i,
        /every/i,
        /always/i,
        /never/i,
        /everyone/i
      ],
      counterExample: "I've met two rude people from that country, so they must all be impolite.",
      fixExample: "Qualify your claim: 'Based on my limited experience with two individuals, I've had negative interactions, but this isn't sufficient to characterize an entire population.'"
    },
    {
      name: "False Dichotomy",
      category: "informal",
      description: "Presenting only two alternatives when more exist",
      signals: [
        /either/i,
        /or/i,
        /only two choices/i,
        /only two options/i,
        /black and white/i
      ],
      counterExample: "Either we cut taxes dramatically or the economy will collapse.",
      fixExample: "Acknowledge more options: 'We have multiple economic policy options including moderate tax adjustments, targeted spending changes, regulatory reform, or various combinations of these approaches.'"
    },
    {
      name: "Slippery Slope",
      category: "informal",
      description: "Asserting that a small first step will inevitably lead to significant and often negative consequences",
      signals: [
        /lead to/i,
        /result in/i,
        /next thing/i,
        /before you know it/i,
        /eventually/i,
        /slippery slope/i
      ],
      counterExample: "If we allow same-sex marriage, next people will want to marry animals or objects.",
      fixExample: "Demonstrate reasoned limits: 'Marriage equality extends the existing institution to same-sex couples who, like opposite-sex couples, can provide informed consent. This logical principle wouldn't apply to non-human animals or objects.'"
    },
    {
      name: "Post Hoc Ergo Propter Hoc",
      category: "informal",
      description: "Assuming that because B followed A, A must have caused B",
      signals: [
        /after/i,
        /following/i,
        /since/i,
        /then/i,
        /caused/i,
        /resulted in/i
      ],
      counterExample: "I wore my lucky socks and we won the game, so my socks caused our victory.",
      fixExample: "Consider alternative explanations: 'While we won after I wore my lucky socks, our victory more likely resulted from effective teamwork, strategy, and skill rather than any clothing choice.'"
    },
    {
      name: "Bandwagon",
      category: "informal",
      description: "Appealing to popularity or the fact that many people do something as validation",
      signals: [
        /everyone/i,
        /everybody/i,
        /popular/i,
        /majority/i,
        /most people/i,
        /common/i
      ],
      counterExample: "Everyone is buying this product, so it must be good.",
      fixExample: "Evaluate on merits: 'While this product is popular, we should evaluate it based on specific features, durability, and how well it meets our particular needs rather than its sales figures.'"
    },
    {
      name: "Genetic Fallacy",
      category: "informal",
      description: "Judging something as good or bad based on where it comes from or its origins",
      signals: [
        /comes from/i,
        /originated/i,
        /source/i,
        /background/i,
        /history/i
      ],
      counterExample: "That idea comes from a corporation, so it must be bad for consumers.",
      fixExample: "Evaluate the idea itself: 'Let's assess this idea based on its actual merits and potential effects rather than dismissing it solely because it originated from a corporate source.'"
    },
    {
      name: "Circular Reasoning",
      category: "informal",
      description: "Making an argument where the conclusion is included in the premises",
      signals: [
        /because it is/i,
        /by definition/i,
        /obviously/i,
        /clearly/i
      ],
      counterExample: "The Bible is true because it's the word of God, and we know it's the word of God because the Bible says so.",
      fixExample: "Provide independent evidence: 'We can evaluate the Bible's historical accuracy by comparing it with archaeological findings and contemporary historical accounts from other sources.'"
    },
    {
      name: "Appeal to Ignorance",
      category: "informal",
      description: "Arguing that a claim is true because it hasn't been proven false, or vice versa",
      signals: [
        /no proof/i,
        /no evidence/i,
        /can't prove/i,
        /hasn't been disproven/i,
        /no one has shown/i
      ],
      counterExample: "No one has proven that ghosts don't exist, so they must be real.",
      fixExample: "Acknowledge burden of proof: 'The absence of evidence against ghosts isn't itself evidence for their existence. To establish their reality, we would need positive, testable evidence.'"
    },
    {
      name: "Red Herring",
      category: "informal",
      description: "Introducing an irrelevant topic to divert attention from the original issue",
      signals: [
        /speaking of/i,
        /that reminds me/i,
        /by the way/i,
        /changing the subject/i,
        /moving on/i
      ],
      counterExample: "We were discussing the budget deficit, but what about the terrible state of our education system?",
      fixExample: "Stay focused: 'Let's complete our analysis of the budget deficit before addressing education funding, as these are separate issues that each deserve thorough consideration.'"
    }
  ];
}
