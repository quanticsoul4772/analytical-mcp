import { z } from 'zod';
import { exaResearch } from '../utils/exa_research.js';
import { Logger } from '../utils/logger.js';
import { ValidationError, DataProcessingError, APIError } from '../utils/errors.js';

// Schema for perspective shifter
const PerspectiveShifterSchema = z.object({
  problem: z.string(),
  currentPerspective: z.string().optional().default('default'),
  shiftType: z
    .enum(['stakeholder', 'discipline', 'contrarian', 'optimistic', 'pessimistic'])
    .optional()
    .default('stakeholder'),
  numberOfPerspectives: z.number().min(1).max(10).optional().default(3),
  includeActionable: z.boolean().optional().default(true),
});

// Export the schema
export const perspectiveShifterSchema = PerspectiveShifterSchema;

// Predefined perspective domains
const PERSPECTIVE_DOMAINS: Record<string, string[]> = {
  stakeholder: ['customer', 'employee', 'investor', 'management', 'community', 'supplier'],
  discipline: [
    'technology',
    'economics',
    'psychology',
    'sociology',
    'environmental studies',
    'design thinking',
  ],
};

// Perspective shifting - internal implementation
async function generatePerspectives(
  problem: string,
  currentPerspective?: string,
  shiftType: string = 'stakeholder',
  numberOfPerspectives: number = 3,
  includeActionable: boolean = true
): Promise<string> {
  // Validate input
  try {
    const validatedInput = PerspectiveShifterSchema.parse({
      problem,
      currentPerspective,
      shiftType,
      numberOfPerspectives,
      includeActionable,
    });
    Logger.debug(`Validated perspective shifting request`, {
      problem: problem.substring(0, 50),
      shiftType,
      numberOfPerspectives,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      Logger.error('Perspective shifter validation failed', error);
      throw new ValidationError(`Invalid parameters for perspective shifting: ${error.message}`, {
        issues: error.issues,
      });
    }
    throw error;
  }

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
        includeContents: true,
      });

      const perspectiveInsights = exaResearch.extractKeyFacts(searchResults.results);

      const perspectiveSection: string[] = [
        `### ${domain.toUpperCase()} Perspective\n\n`,
        perspectiveInsights.join('\n\n'),
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
    if (error instanceof APIError) {
      Logger.error('API error during perspective shifting', error, {
        status: error.status,
        endpoint: error.endpoint,
      });
      throw error; // Rethrow API errors as they are already properly formatted
    }

    Logger.error('Perspective Shifting Error', error, {
      problem: problem.substring(0, 50),
      shiftType,
      numberOfPerspectives,
    });

    throw new DataProcessingError(
      `Perspective shifting failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { shiftType, problemLength: problem.length }
    );
  }
}

// Export the function with support for both parameter styles
export const perspectiveShifter = async (
  problemOrParams: string | {
    problem: string;
    currentPerspective?: string;
    shiftType?: string;
    numberOfPerspectives?: number;
    includeActionable?: boolean;
  },
  currentPerspective?: string,
  shiftType: string = 'stakeholder',
  numberOfPerspectives: number = 3,
  includeActionable: boolean = true
): Promise<string> => {
  if (typeof problemOrParams === 'object') {
    return generatePerspectives(
      problemOrParams.problem,
      problemOrParams.currentPerspective,
      problemOrParams.shiftType ?? 'stakeholder',
      problemOrParams.numberOfPerspectives ?? 3,
      problemOrParams.includeActionable ?? true
    );
  } else {
    return generatePerspectives(
      problemOrParams,
      currentPerspective,
      shiftType,
      numberOfPerspectives,
      includeActionable
    );
  }
};