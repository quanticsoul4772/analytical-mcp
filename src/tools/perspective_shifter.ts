import { z } from 'zod';
import { exaResearch } from '../utils/exa_research.js';

// Schema for perspective shifter
const PerspectiveShifterSchema = z.object({
  problem: z.string(),
  currentPerspective: z.string().optional().default('default'),
  shiftType: z.enum(['stakeholder', 'discipline', 'contrarian', 'optimistic', 'pessimistic']).optional().default('stakeholder'),
  numberOfPerspectives: z.number().min(1).max(10).optional().default(3),
  includeActionable: z.boolean().optional().default(true)
});

// Predefined perspective domains
const PERSPECTIVE_DOMAINS: Record<string, string[]> = {
  stakeholder: [
    'customer', 
    'employee', 
    'investor', 
    'management', 
    'community', 
    'supplier'
  ],
  discipline: [
    'technology', 
    'economics', 
    'psychology', 
    'sociology', 
    'environmental studies', 
    'design thinking'
  ]
};

// Perspective shifting tool
async function perspectiveShifter(
  problem: string,
  currentPerspective?: string,
  shiftType: string = 'stakeholder',
  numberOfPerspectives: number = 3,
  includeActionable: boolean = true
): Promise<string> {
  // Validate input
  const validatedInput = PerspectiveShifterSchema.parse({
    problem,
    currentPerspective,
    shiftType,
    numberOfPerspectives,
    includeActionable
  });

  let result = `# Perspective Shifting Analysis\n\n`;
  result += `## Original Problem: ${problem}\n\n`;

  const domains = PERSPECTIVE_DOMAINS[shiftType] || [];

  try {
    // Ensure we have enough domains
    while (domains.length < numberOfPerspectives) {
      domains.push(`custom_domain_${domains.length + 1}`);
    }

    const perspectives: string[] = [];

    for (const domain of domains.slice(0, numberOfPerspectives)) {
      const researchQuery = `Analyze the problem "${problem}" from the perspective of a ${domain}`;
      
      // Use Exa research to get diverse perspectives
      const searchResults = await exaResearch.search({
        query: researchQuery,
        numResults: 2,
        useWebResults: true,
        useNewsResults: false,
        includeContents: true
      });

      const perspectiveInsights = exaResearch.extractKeyFacts(searchResults.results);
      
      const perspectiveSection: string[] = [
        `### ${domain.toUpperCase()} Perspective\n\n`,
        perspectiveInsights.join('\n\n')
      ];
      
      if (includeActionable) {
        perspectiveSection.push(
          `\n\n**Actionable Insights:**\n`,
          `- Consider the unique constraints and opportunities from the ${domain} perspective\n`
        );
      }

      perspectives.push(perspectiveSection.join(''));
    }

    result += perspectives.join('\n\n');

    return result;
  } catch (error) {
    console.error('Perspective Shifting Error:', error);
    throw new Error(`Perspective shifting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export both the function and schema
export { perspectiveShifter, PerspectiveShifterSchema as perspectiveShifterSchema };
