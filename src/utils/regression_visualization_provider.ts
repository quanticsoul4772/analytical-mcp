/**
 * Regression Visualization Provider
 * 
 * Handles regression visualization suggestions and formatting.
 * Focused responsibility: Visualization recommendations and result formatting.
 */

import { ValidationHelpers } from './validation_helpers.js';
import { Logger } from './logger.js';

/**
 * RegressionVisualizationProvider - Focused class for regression visualization operations
 */
export class RegressionVisualizationProvider {

  constructor() {
    // No dependencies needed for visualization suggestions
  }

  /**
   * Validates visualization suggestion inputs
   */
  private validateVisualizationSuggestionsInputs(
    independentVariables: string[],
    dependentVariable: string,
    regressionType: string
  ): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(independentVariables));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(dependentVariable));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(regressionType));
  }

  /**
   * Creates variable count-based visualization mapping
   */
  private createVariableCountVisualizationMapping(): Record<string, (independentVariables: string[], dependentVariable: string) => string> {
    return {
      single: (independentVariables, dependentVariable) => {
        const variable = independentVariables[0] ?? 'X';
        return `- Scatter plot of ${variable} vs ${dependentVariable}\n` +
               `- Regression line plot\n` +
               `- Residual plot to check regression assumptions\n`;
      },
      multiple: () => {
        return `- Partial regression plots for each independent variable\n` +
               `- Pairwise scatter plots of all variables\n` +
               `- Residual plots to check regression assumptions\n`;
      },
    };
  }

  /**
   * Creates regression type-specific visualization mapping
   */
  private createRegressionTypeVisualizationMapping(): Record<string, () => string> {
    return {
      polynomial: () => `- Curve fit plot showing the polynomial relationship\n`,
      logistic: () => `- ROC curve showing model performance\n` +
                     `- Confusion matrix visualization\n`,
      multivariate: () => `- Correlation heatmap of all variables\n` +
                         `- 3D scatter plots for selected variable combinations\n`,
      linear: () => `- Fitted line plot with confidence intervals\n` +
                   `- Residual vs fitted values plot\n`,
    };
  }

  /**
   * Generates visualization suggestions based on regression type
   */
  generateVisualizationSuggestions(
    independentVariables: string[],
    dependentVariable: string,
    regressionType: string
  ): string {
    // Apply ValidationHelpers early return patterns
    this.validateVisualizationSuggestionsInputs(independentVariables, dependentVariable, regressionType);
    
    try {
      let result = `\n**Visualization Suggestions:**\n\n`;
      
      // Add variable count-based suggestions using mapping pattern
      const variableMapping = this.createVariableCountVisualizationMapping();
      const variableType = independentVariables.length === 1 ? 'single' : 'multiple';
      result += variableMapping[variableType](independentVariables, dependentVariable);
      
      // Add regression type-specific suggestions using mapping pattern
      const regressionMapping = this.createRegressionTypeVisualizationMapping();
      const typeHandler = regressionMapping[regressionType];
      if (typeHandler) {
        result += typeHandler();
      }
      
      Logger.debug('Generated visualization suggestions', { 
        regressionType, 
        variableCount: independentVariables.length,
        dependentVariable
      });
      
      return result;
    } catch (error) {
      Logger.error('Failed to generate visualization suggestions', error);
      throw new Error('Failed to generate visualization suggestions');
    }
  }

  /**
   * Validates interpretation inputs
   */
  private validateInterpretationInputs(
    independentVariables: string[],
    dependentVariable: string,
    regressionType: string
  ): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(independentVariables));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(dependentVariable));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(regressionType));
  }

  /**
   * Creates interpretation mapping for different regression types
   */
  private createInterpretationMapping(): Record<string, (independentVariables: string[], dependentVariable: string) => string> {
    return {
      linear: (independentVariables, dependentVariable) => {
        const variables = independentVariables.join(', ');
        return `The linear regression model examines the relationship between ${variables} and ${dependentVariable}. ` +
               `Each coefficient represents the expected change in ${dependentVariable} for a one-unit increase ` +
               `in the corresponding predictor variable, holding all other variables constant.`;
      },
      polynomial: (independentVariables, dependentVariable) => {
        const variable = independentVariables[0] ?? 'the predictor';
        return `The polynomial regression model captures non-linear relationships between ${variable} and ${dependentVariable}. ` +
               `Higher-order terms allow the model to fit curves and capture more complex patterns in the data.`;
      },
      logistic: (independentVariables, dependentVariable) => {
        const variables = independentVariables.join(', ');
        return `The logistic regression model predicts the probability of ${dependentVariable} based on ${variables}. ` +
               `Coefficients represent the change in log-odds for a one-unit increase in each predictor variable.`;
      },
      multivariate: (independentVariables, dependentVariable) => {
        return `The multivariate regression model examines relationships between multiple predictors and ${dependentVariable}. ` +
               `This approach allows for understanding the combined effects of all predictor variables simultaneously.`;
      }
    };
  }

  /**
   * Generates interpretation text for regression results
   */
  generateInterpretation(
    independentVariables: string[],
    dependentVariable: string,
    regressionType: string
  ): string {
    // Apply ValidationHelpers early return patterns
    this.validateInterpretationInputs(independentVariables, dependentVariable, regressionType);
    
    try {
      let result = `\n**Interpretation:**\n\n`;
      
      // Get interpretation using mapping pattern
      const interpretationMapping = this.createInterpretationMapping();
      const interpretationHandler = interpretationMapping[regressionType];
      
      if (interpretationHandler) {
        result += interpretationHandler(independentVariables, dependentVariable);
      } else {
        result += `This regression analysis examines the relationship between ${independentVariables.join(', ')} and ${dependentVariable}.`;
      }
      
      result += `\n\n`;
      
      Logger.debug('Generated interpretation', { 
        regressionType, 
        variableCount: independentVariables.length 
      });
      
      return result;
    } catch (error) {
      Logger.error('Failed to generate interpretation', error);
      throw new Error('Failed to generate interpretation');
    }
  }

  /**
   * Creates regression type title mapping
   */
  private createRegressionTypeTitleMapping(): Record<string, string> {
    return {
      linear: 'Linear Regression',
      polynomial: 'Polynomial Regression',
      logistic: 'Logistic Regression',
      multivariate: 'Multivariate Regression'
    };
  }

  /**
   * Gets formatted title for regression type
   */
  getRegressionTypeTitle(regressionType: string): string {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(regressionType));
    
    const titleMapping = this.createRegressionTypeTitleMapping();
    return titleMapping[regressionType] ?? 'Regression Analysis';
  }

  /**
   * Creates analysis header mapping
   */
  private createAnalysisHeaderMapping(): Record<string, (independentVariables: string[], dependentVariable: string) => string> {
    return {
      linear: (independentVariables, dependentVariable) => 
        `Performing linear regression with ${independentVariables.join(', ')} as predictors and ${dependentVariable} as the response variable.\n\n`,
      polynomial: (independentVariables, dependentVariable) => 
        `Performing polynomial regression with ${independentVariables[0] ?? 'predictor'} and ${dependentVariable} as the response variable.\n\n`,
      logistic: (independentVariables, dependentVariable) => 
        `Performing logistic regression with ${independentVariables.join(', ')} as predictors and ${dependentVariable} as the response variable.\n\n`,
      multivariate: (independentVariables, dependentVariable) => 
        `Performing multivariate regression with ${independentVariables.length} predictors and ${dependentVariable} as the response variable.\n\n`
    };
  }

  /**
   * Generates analysis header based on regression type
   */
  generateAnalysisHeader(
    independentVariables: string[],
    dependentVariable: string,
    regressionType: string
  ): string {
    this.validateInterpretationInputs(independentVariables, dependentVariable, regressionType);
    
    const headerMapping = this.createAnalysisHeaderMapping();
    const headerHandler = headerMapping[regressionType];
    
    if (headerHandler) {
      return headerHandler(independentVariables, dependentVariable);
    }
    
    return `Performing ${regressionType} regression analysis.\n\n`;
  }

  /**
   * Formats complete regression analysis result
   */
  formatAnalysisResult(
    regressionResult: string,
    independentVariables: string[],
    dependentVariable: string,
    regressionType: string
  ): string {
    this.validateInterpretationInputs(independentVariables, dependentVariable, regressionType);
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(regressionResult));
    
    try {
      let result = regressionResult;
      
      // Add interpretation
      result += this.generateInterpretation(independentVariables, dependentVariable, regressionType);
      
      // Add visualization suggestions
      result += this.generateVisualizationSuggestions(independentVariables, dependentVariable, regressionType);
      
      Logger.debug('Formatted complete analysis result', { 
        regressionType,
        hasInterpretation: true,
        hasVisualization: true
      });
      
      return result;
    } catch (error) {
      Logger.error('Failed to format analysis result', error);
      throw new Error('Failed to format analysis result');
    }
  }

  /**
   * Generates chart configuration suggestions for data visualization tools
   */
  generateChartConfiguration(
    independentVariables: string[],
    dependentVariable: string,
    regressionType: string
  ): any {
    this.validateVisualizationSuggestionsInputs(independentVariables, dependentVariable, regressionType);
    
    const baseConfig = {
      title: this.getRegressionTypeTitle(regressionType),
      independentVariables,
      dependentVariable,
      regressionType
    };
    
    // Add type-specific configuration
    switch (regressionType) {
      case 'linear':
        return {
          ...baseConfig,
          chartType: 'scatter',
          showTrendline: true,
          showConfidenceInterval: true
        };
      case 'polynomial':
        return {
          ...baseConfig,
          chartType: 'scatter',
          showCurvefit: true,
          polynomialDegree: 2
        };
      case 'logistic':
        return {
          ...baseConfig,
          chartType: 'classification',
          showROC: true,
          showConfusionMatrix: true
        };
      case 'multivariate':
        return {
          ...baseConfig,
          chartType: 'correlation_heatmap',
          show3D: independentVariables.length >= 2
        };
      default:
        return baseConfig;
    }
  }

  /**
   * Generates diagnostic plot suggestions
   */
  generateDiagnosticPlotSuggestions(regressionType: string): string[] {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(regressionType));
    
    const commonPlots = [
      'Residuals vs Fitted Values',
      'Normal Q-Q Plot of Residuals',
      'Scale-Location Plot',
      'Residuals vs Leverage'
    ];
    
    const typeSpecificPlots: Record<string, string[]> = {
      linear: ['Added Variable Plots'],
      polynomial: ['Component+Residual Plots'],
      logistic: ['ROC Curve', 'Calibration Plot'],
      multivariate: ['Partial Regression Plots', 'VIF Bar Chart']
    };
    
    const specificPlots = typeSpecificPlots[regressionType] ?? [];
    return [...commonPlots, ...specificPlots];
  }
}
