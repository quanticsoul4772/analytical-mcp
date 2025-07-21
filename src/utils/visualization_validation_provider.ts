import { ValidationHelpers } from './validation_helpers.js';
import { ValidationError } from './errors.js';

/**
 * VisualizationValidationProvider
 * 
 * Handles input validation and data preprocessing for visualization generation.
 * Provides focused responsibility for validation logic across all chart types.
 * Integrates ValidationHelpers patterns for input validation and early returns.
 */
export class VisualizationValidationProvider {
  /**
   * Validate visualization type against supported types
   * @param type - The visualization type to validate
   * @throws ValidationError if type is invalid
   */
  public validateVisualizationType(type: string): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(type));
    const validTypes = ['scatter', 'line', 'bar', 'histogram', 'box', 'heatmap', 'pie', 'violin', 'correlation'];
    if (!validTypes.includes(type)) {
      throw new ValidationError(`Invalid visualization type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Validate inputs for line chart generation
   * @param baseSpec - Base specification object
   * @param variables - Array of variable names
   * @param data - Array of data objects
   * @throws ValidationError if inputs are invalid
   */
  public validateLineChartInputs(
    baseSpec: any,
    variables: string[],
    data: Record<string, any>[]
  ): void {
    if (!baseSpec || typeof baseSpec !== 'object') {
      throw new ValidationError('Base specification is required and must be an object.');
    }
    
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(data));
    
    if (variables.length < 2) {
      throw new ValidationError('Line chart requires at least 2 variables.');
    }
  }

  /**
   * Validate inputs for bar chart generation
   * @param baseSpec - Base specification object
   * @param variables - Array of variable names
   * @param data - Array of data objects
   * @throws ValidationError if inputs are invalid
   */
  public validateBarChartInputs(
    baseSpec: any,
    variables: string[],
    data: Record<string, any>[]
  ): void {
    if (!baseSpec || typeof baseSpec !== 'object') {
      throw new ValidationError('Base specification is required and must be an object.');
    }
    
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(data));
    
    if (variables.length < 2) {
      throw new ValidationError('Bar chart requires at least 2 variables.');
    }
  }

  /**
   * Validate inputs for heatmap generation
   * @param baseSpec - Base specification object
   * @param variables - Array of variable names
   * @param data - Array of data objects
   * @throws ValidationError if inputs are invalid
   */
  public validateHeatmapInputs(
    baseSpec: any,
    variables: string[],
    data: Record<string, any>[]
  ): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(data));
    
    if (variables.length < 2) {
      throw new ValidationError('Heatmap requires at least 2 variables for X and Y axes.');
    }
    
    if (variables.length > 3) {
      throw new ValidationError('Heatmap supports at most 3 variables (X, Y, and optional color).');
    }
  }

  /**
   * Validate inputs for violin plot generation
   * @param baseSpec - Base specification object
   * @param variables - Array of variable names
   * @throws ValidationError if inputs are invalid
   */
  public validateViolinPlotInputs(
    baseSpec: any,
    variables: string[]
  ): void {
    if (!baseSpec || typeof baseSpec !== 'object') {
      throw new ValidationError('Base specification is required and must be an object.');
    }
    
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    
    if (variables.length < 1) {
      throw new ValidationError('Violin plot requires at least 1 variable.');
    }
  }

  /**
   * Validate inputs for correlation chart generation
   * @param baseSpec - Base specification object
   * @param variables - Array of variable names
   * @throws ValidationError if inputs are invalid
   */
  public validateCorrelationInputs(
    baseSpec: any,
    variables: string[]
  ): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    
    if (variables.length < 2) {
      throw new ValidationError('Correlation analysis requires at least 2 variables.');
    }
  }

  /**
   * Validate general visualization inputs
   * @param data - Array of data objects
   * @param visualizationType - Type of visualization
   * @param variables - Array of variable names
   * @throws ValidationError if inputs are invalid
   */
  public validateGeneralInputs(
    data: Record<string, any>[],
    visualizationType: string,
    variables: string[]
  ): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(data));
    this.validateVisualizationType(visualizationType);
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateVariablesInData(variables, data));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateVariableCount(visualizationType, variables.length));
  }

  /**
   * Validate scatter plot specific inputs
   * @param variables - Array of variable names
   * @param data - Array of data objects
   * @throws ValidationError if inputs are invalid
   */
  public validateScatterPlotInputs(
    variables: string[],
    data: Record<string, any>[]
  ): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(data));
    
    if (variables.length < 2) {
      throw new ValidationError('Scatter plot requires at least 2 variables (X and Y).');
    }
    
    if (variables.length > 4) {
      throw new ValidationError('Scatter plot supports at most 4 variables (X, Y, size, color).');
    }
  }

  /**
   * Validate histogram specific inputs
   * @param variables - Array of variable names
   * @param data - Array of data objects
   * @throws ValidationError if inputs are invalid
   */
  public validateHistogramInputs(
    variables: string[],
    data: Record<string, any>[]
  ): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(data));
    
    if (variables.length !== 1) {
      throw new ValidationError('Histogram requires exactly 1 variable.');
    }
  }

  /**
   * Validate box plot specific inputs
   * @param variables - Array of variable names
   * @param data - Array of data objects
   * @throws ValidationError if inputs are invalid
   */
  public validateBoxPlotInputs(
    variables: string[],
    data: Record<string, any>[]
  ): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(data));
    
    if (variables.length < 1 || variables.length > 2) {
      throw new ValidationError('Box plot requires 1-2 variables (value and optional grouping).');
    }
  }

  /**
   * Validate pie chart specific inputs
   * @param variables - Array of variable names
   * @param data - Array of data objects
   * @throws ValidationError if inputs are invalid
   */
  public validatePieChartInputs(
    variables: string[],
    data: Record<string, any>[]
  ): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(data));
    
    if (variables.length < 1 || variables.length > 2) {
      throw new ValidationError('Pie chart requires 1-2 variables (category and optional value).');
    }
  }
}
