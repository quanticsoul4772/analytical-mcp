import { z } from 'zod';
import { exaResearch } from '../utils/exa_research.js';
import { Logger } from '../utils/logger.js';
import { ValidationError, DataProcessingError, APIError } from '../utils/errors.js';
import { MAX_STRING_LENGTH } from './limits.js';

// Schema for perspective shifter
const PerspectiveShifterSchema = z.object({
  problem: z.string().max(MAX_STRING_LENGTH).describe('The problem or situation to examine from new angles.'),
  currentPerspective: z
    .string()
    .optional()
    .default('default')
    .describe('The viewpoint you currently hold, for context (optional).'),
  shiftType: z
    .enum(['stakeholder', 'discipline', 'contrarian', 'optimistic', 'pessimistic'])
    .optional()
    .default('stakeholder')
    .describe(
      "How to generate perspectives: 'stakeholder' (default) and 'discipline' are research-backed; 'contrarian', 'optimistic', and 'pessimistic' produce generic framings."
    ),
  numberOfPerspectives: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(3)
    .describe('How many perspectives to generate, 1-10 (default 3).'),
  includeActionable: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include actionable insights with each perspective (default true).'),
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
      throw new ValidationError(
        'ERR_1001',
        `Invalid parameters for perspective shifting: ${error.message}`,
        { issues: error.issues }
      );
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

    const selectedDomains = domains.slice(0, numberOfPerspectives);

    // Run one Exa search per domain in parallel
    const searchResults = await Promise.all(
      selectedDomains.map((domain) =>
        exaResearch.search({
          query: `Analyze the problem "${problem}" from the perspective of a ${domain}`,
          numResults: 2,
          useWebResults: true,
          useNewsResults: false,
          includeContents: true,
        })
      )
    );

    const perspectives = selectedDomains.map((domain, i) => {
      const perspectiveInsights = exaResearch.extractKeyFacts(searchResults[i].results);

      const perspectiveSection: string[] = [
        `### ${domain.toUpperCase()} Perspective\n\n`,
        perspectiveInsights.join('\n\n'),
      ];

      if (includeActionable) {
        const lead = perspectiveInsights[0];
        perspectiveSection.push(
          `\n\n**Actionable Insights:**\n`,
          lead
            ? `- For "${problem}" through a ${domain} lens: ${lead}\n`
            : `- No ${domain}-specific evidence was retrieved for "${problem}".\n`
        );
      }

      return perspectiveSection.join('');
    });

    result += perspectives.join('\n\n');

    return result;
  } catch (error) {
    if (error instanceof APIError) {
      Logger.error('API error during perspective shifting', error, {
        status: error.context?.status,
        endpoint: error.context?.endpoint,
      });
      throw error; // Rethrow API errors as they are already properly formatted
    }

    Logger.error('Perspective Shifting Error', error, {
      problem: problem.substring(0, 50),
      shiftType,
      numberOfPerspectives,
    });

    throw new DataProcessingError(
      'ERR_3001',
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