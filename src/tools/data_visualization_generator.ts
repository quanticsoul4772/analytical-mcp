import { z } from 'zod';
import { ValidationHelpers } from '../utils/validation_helpers.js';
import { ValidationError } from '../utils/errors.js';
import { CustomizationProvider } from '../utils/customization_provider.js';
import { VisualizationValidationProvider } from '../utils/visualization_validation_provider.js';
import { OutputFormattingProvider } from '../utils/output_formatting_provider.js';
import { VisualizationDetailProvider } from '../utils/visualization_detail_provider.js';
import { VisualizationSpecProvider } from '../utils/visualization_spec_provider.js';

// TypeScript interface for visualization options

// Module-level provider instance for chart generation functions
const outputFormattingProvider = new OutputFormattingProvider();
export interface VisualizationOptions {
  data: Record<string, any>[];
  visualizationType: 'scatter' | 'line' | 'bar' | 'histogram' | 'box' | 'heatmap' | 'pie' | 'violin' | 'correlation';
  variables: string[];
  title?: string;
  includeTrendline?: boolean;
  options?: Record<string, any>;
}

// Schema for the tool parameters
export const dataVisualizationGeneratorSchema = z.object({
  data: z.array(z.record(z.string(), z.any())).describe('Array of data objects to visualize'),
  visualizationType: z
    .enum(['scatter', 'line', 'bar', 'histogram', 'box', 'heatmap', 'pie', 'violin', 'correlation'])
    .describe('Type of visualization to generate'),
  variables: z
    .array(z.string())
    .describe('Variable names to include in the visualization (properties in data objects)'),
  title: z.string().optional().describe('Optional title for the visualization'),
  includeTrendline: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include a trendline (for scatter plots)'),
  options: z.record(z.any()).optional().describe('Additional visualization options'),
});

// Tool implementation
export async function dataVisualizationGenerator(
  params: VisualizationOptions
): Promise<string> {
  // Destructure parameters from options object
  const { 
    data, 
    visualizationType, 
    variables, 
    title, 
    includeTrendline = false, 
    options 
  } = params;

  // Initialize provider instances
  const validationProvider = new VisualizationValidationProvider();
  const customizationProvider = new CustomizationProvider();
  const outputFormattingProvider = new OutputFormattingProvider();
  const detailProvider = new VisualizationDetailProvider();
  const specProvider = new VisualizationSpecProvider();

  // Apply early return validation patterns
  validationProvider.validateGeneralInputs(data, visualizationType, variables);

  // Set default title if not provided
  const visualizationTitle =
    title || `${outputFormattingProvider.formatVisualizationType(visualizationType)} of ${variables.join(', ')}`;

  // Generate result using extracted helper methods
  let result = outputFormattingProvider.generateVisualizationHeader(visualizationType, variables, visualizationTitle, data.length);
  
  // Add visualization-specific details
  result += detailProvider.getVisualizationTypeInfo(visualizationType);

  // Generate visualization specification
  const spec = specProvider.generateVisualizationSpec(
    visualizationType,
    variables,
    data,
    visualizationTitle,
    includeTrendline,
    options
  );

  // Add specification and usage sections using extracted helpers
  result += outputFormattingProvider.generateSpecificationSection(spec);
  result += outputFormattingProvider.generateUsageInstructions();
  result += outputFormattingProvider.generateRecommendationSections(visualizationType, variables);

  return result;
}


