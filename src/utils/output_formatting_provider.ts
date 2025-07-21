import { ValidationHelpers } from './validation_helpers.js';
import { CustomizationProvider } from './customization_provider.js';

/**
 * OutputFormattingProvider - Handles all output formatting responsibilities for data visualization generator
 * 
 * This provider class encapsulates:
 * - Header generation for visualization results
 * - Specification section formatting
 * - Usage instruction generation
 * - Recommendation section formatting
 * - Type and field name formatting utilities
 * 
 * Uses ValidationHelpers patterns for input validation and focused responsibility principle.
 */
export class OutputFormattingProvider {
  private customizationProvider: CustomizationProvider;

  constructor() {
    this.customizationProvider = new CustomizationProvider();
  }

  /**
   * Generate visualization header with title, variables, and data info
   * 
   * @param visualizationType - Type of visualization
   * @param variables - Array of variable names
   * @param title - Visualization title
   * @param dataLength - Number of data points
   * @returns Formatted header string
   */
  generateVisualizationHeader(visualizationType: string, variables: string[], title: string, dataLength: number): string {
    // Apply ValidationHelpers early return patterns
    const typeValidation = ValidationHelpers.validateVisualizationType(visualizationType);
    ValidationHelpers.throwIfInvalid(typeValidation);

    const variablesValidation = ValidationHelpers.validateVariableCount(visualizationType, variables.length);
    ValidationHelpers.throwIfInvalid(variablesValidation);

    const titleValidation = ValidationHelpers.validateNonEmptyString(title);
    ValidationHelpers.throwIfInvalid(titleValidation);

    if (typeof dataLength !== 'number' || dataLength < 0) {
      throw new Error('Data length must be a non-negative number');
    }

    let result = `## Data Visualization Generator: ${this.formatVisualizationType(visualizationType)}\n\n`;
    result += `**Variables:** ${variables.join(', ')}\n`;
    result += `**Title:** ${title}\n\n`;
    result += `**Data Points:** ${dataLength}\n\n`;
    return result;
  }

  /**
   * Generate specification section with JSON formatting
   * 
   * @param spec - Vega-Lite specification object
   * @returns Formatted specification section
   */
  generateSpecificationSection(spec: any): string {
    // Apply ValidationHelpers validation
    if (!spec || typeof spec !== 'object') {
      throw new Error('Specification must be a valid object');
    }

    let result = `\n### Visualization Specification (Vega-Lite)\n\n`;
    result += '```json\n';
    result += JSON.stringify(spec, null, 2);
    result += '\n```\n\n';
    return result;
  }

  /**
   * Generate usage instructions for the visualization
   * 
   * @returns Formatted usage instructions
   */
  generateUsageInstructions(): string {
    let result = `### Usage Instructions\n\n`;
    result += `This Vega-Lite specification can be used in various ways:\n\n`;
    result += `1. **Online Editor:** Paste the specification into the [Vega-Lite Editor](https://vega.github.io/editor/#/)\n`;
    result += `2. **Embedding in HTML:** Use the Vega-Embed library to include this visualization in a web page\n`;
    result += `3. **Notebooks:** Visualize in Jupyter notebooks using the Altair Python library\n`;
    result += `4. **Applications:** Use the Vega-Lite runtime in JavaScript applications\n\n`;
    return result;
  }

  /**
   * Generate recommendation sections using CustomizationProvider
   * 
   * @param visualizationType - Type of visualization
   * @param variables - Array of variable names
   * @returns Formatted recommendation sections
   */
  generateRecommendationSections(visualizationType: string, variables: string[]): string {
    // Apply ValidationHelpers early return patterns
    const typeValidation = ValidationHelpers.validateVisualizationType(visualizationType);
    ValidationHelpers.throwIfInvalid(typeValidation);

    const variablesValidation = ValidationHelpers.validateVariableCount(visualizationType, variables.length);
    ValidationHelpers.throwIfInvalid(variablesValidation);

    let result = `### Recommended Customizations\n\n`;
    result += this.customizationProvider.getRecommendedCustomizations(visualizationType, variables);
    result += `### Alternative Visualization Options\n\n`;
    result += this.customizationProvider.getAlternativeVisualizations(visualizationType, variables);
    return result;
  }

  /**
   * Format visualization type for display
   * 
   * @param type - Visualization type string
   * @returns Formatted type name
   */
  formatVisualizationType(type: string): string {
    // Apply ValidationHelpers validation
    const typeValidation = ValidationHelpers.validateVisualizationType(type);
    ValidationHelpers.throwIfInvalid(typeValidation);

    switch (type) {
      case 'scatter':
        return 'Scatter Plot';
      case 'line':
        return 'Line Chart';
      case 'bar':
        return 'Bar Chart';
      case 'histogram':
        return 'Histogram';
      case 'box':
        return 'Box Plot';
      case 'heatmap':
        return 'Heatmap';
      case 'pie':
        return 'Pie Chart';
      case 'violin':
        return 'Violin Plot';
      case 'correlation':
        return 'Correlation Matrix';
      default:
        return type; // Fallback for unknown types
    }
  }

  /**
   * Format field name for display using ValidationHelpers
   * 
   * @param field - Field name to format
   * @returns Formatted field name
   */
  formatFieldName(field: string): string {
    return ValidationHelpers.formatFieldName(field);
  }

  /**
   * Generate complete formatted output for visualization results
   * 
   * @param visualizationType - Type of visualization
   * @param variables - Array of variable names
   * @param title - Visualization title
   * @param dataLength - Number of data points
   * @param spec - Vega-Lite specification object
   * @returns Complete formatted output string
   */
  generateCompleteOutput(
    visualizationType: string, 
    variables: string[], 
    title: string, 
    dataLength: number, 
    spec: any
  ): string {
    let result = this.generateVisualizationHeader(visualizationType, variables, title, dataLength);
    result += this.generateSpecificationSection(spec);
    result += this.generateUsageInstructions();
    result += this.generateRecommendationSections(visualizationType, variables);
    return result;
  }
}
