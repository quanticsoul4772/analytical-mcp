import { ValidationHelpers } from './validation_helpers.js';
import { ValidationError } from './errors.js';

/**
 * VisualizationSpecProvider - Handles Vega-Lite specification generation for different chart types
 * 
 * Responsibilities:
 * - Generate Vega-Lite specifications for all chart types
 * - Manage chart-type specific implementations
 * - Handle base specification creation
 * - Apply ValidationHelpers patterns for input validation
 * 
 * Part of Phase 4 god class decomposition using ValidationHelpers + provider pattern methodology
 */
export class VisualizationSpecProvider {
  
  /**
   * Generate a Vega-Lite specification based on the visualization type
   */
  generateVisualizationSpec(
    type: string,
    variables: string[],
    data: Record<string, any>[],
    title: string,
    includeTrendline: boolean = false,
    options?: Record<string, any>
  ): any {
    // Apply ValidationHelpers early return patterns
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(type));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(data));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(title));
    
    const baseSpec = this.createBaseSpecification(data, title, options);
    const specGenerators = this.createSpecificationGeneratorMapping();
    
    // Use mapping for cleaner logic instead of long switch statement
    const specGenerator = specGenerators[type];
    if (specGenerator) {
      return specGenerator(baseSpec, variables, data, includeTrendline, options);
    }
    
    // Fallback for unknown types
    return this.generateDefaultSpec(baseSpec, variables);
  }

  /**
   * Create base specification for all chart types
   */
  private createBaseSpecification(data: Record<string, any>[], title: string, options?: Record<string, any>): any {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(data));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(title));
    
    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: { values: data },
      title: title,
      width: options?.width || 600,
      height: options?.height || 400,
    };
  }

  /**
   * Create mapping pattern for specification generators
   */
  private createSpecificationGeneratorMapping(): Record<string, (baseSpec: any, variables: string[], data: Record<string, any>[], includeTrendline?: boolean, options?: Record<string, any>) => any> {
    return {
      scatter: (baseSpec, variables, data, includeTrendline) => this.generateScatterPlotSpec(baseSpec, variables, data, includeTrendline || false),
      line: (baseSpec, variables, data) => this.generateLineChartSpec(baseSpec, variables, data),
      bar: (baseSpec, variables, data) => this.generateBarChartSpec(baseSpec, variables, data),
      histogram: (baseSpec, variables, _, __, options) => this.generateHistogramSpec(baseSpec, variables, options),
      box: (baseSpec, variables) => this.generateBoxPlotSpec(baseSpec, variables),
      heatmap: (baseSpec, variables, data) => this.generateHeatmapSpec(baseSpec, variables, data),
      pie: (baseSpec, variables) => this.generatePieChartSpec(baseSpec, variables),
      violin: (baseSpec, variables) => this.generateViolinPlotSpec(baseSpec, variables),
      correlation: (baseSpec, variables) => this.generateCorrelationSpec(baseSpec, variables),
    };
  }

  /**
   * Generate scatter plot specification with ValidationHelpers patterns
   */
  private generateScatterPlotSpec(
    baseSpec: any,
    variables: string[],
    data: Record<string, any>[],
    includeTrendline: boolean
  ): any {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    if (variables.length < 2) {
      throw new ValidationError('ERR_1001', 'Scatter plot requires at least 2 variables');
    }

    const spec = {
      ...baseSpec,
      mark: 'point',
      encoding: {
        x: {
          field: ValidationHelpers.ensureString(variables[0], 'x'),
          type: 'quantitative',
          title: this.formatFieldName(ValidationHelpers.ensureString(variables[0], 'x')),
          scale: { zero: false },
        },
        y: {
          field: ValidationHelpers.ensureString(variables[1], 'y'),
          type: 'quantitative',
          title: this.formatFieldName(ValidationHelpers.ensureString(variables[1], 'y')),
          scale: { zero: false },
        },
        ...(variables.length > 2 && {
          size: {
            field: ValidationHelpers.ensureString(variables[2], 'size'),
            type: 'quantitative',
            title: this.formatFieldName(ValidationHelpers.ensureString(variables[2], 'size')),
          },
        }),
        ...(variables.length > 3 && {
          color: {
            field: ValidationHelpers.ensureString(variables[3], 'color'),
            type: this.isLikelyCategorical(ValidationHelpers.ensureString(variables[3], 'color'), data) ? 'nominal' : 'quantitative',
            title: this.formatFieldName(ValidationHelpers.ensureString(variables[3], 'color')),
          },
        }),
        tooltip: variables.map((v) => ({
          field: ValidationHelpers.ensureString(v, 'variable'),
          type: this.isLikelyCategorical(ValidationHelpers.ensureString(v, 'variable'), data) ? 'nominal' : 'quantitative',
        })),
      },
    };

    if (!includeTrendline) {
      return spec;
    }

    return {
      ...baseSpec,
      layer: [
        { mark: 'point' },
        {
          mark: { type: 'line', color: 'firebrick', opacity: 0.5 },
          transform: [{ 
            regression: ValidationHelpers.ensureString(variables[1], 'y'), 
            on: ValidationHelpers.ensureString(variables[0], 'x') 
          }],
        },
      ],
    };
  }

  /**
   * Generate line chart specification with ValidationHelpers patterns
   */
  private generateLineChartSpec(
    baseSpec: any,
    variables: string[],
    data: Record<string, any>[]
  ): any {
    this.validateLineChartInputs(baseSpec, variables, data);
    
    return {
      ...baseSpec,
      mark: this.createLineMarkConfiguration(),
      encoding: this.createLineEncodingMapping(variables, data),
    };
  }

  /**
   * Validate line chart inputs using ValidationHelpers patterns
   */
  private validateLineChartInputs(
    baseSpec: any,
    variables: string[],
    data: Record<string, any>[]
  ): void {
    if (!baseSpec || typeof baseSpec !== 'object') {
      throw new ValidationError('ERR_1001', 'Base specification is required and must be an object.');
    }
    
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(data));
    
    if (variables.length < 2) {
      throw new ValidationError('ERR_1001', 'Line chart requires at least 2 variables.');
    }
  }

  /**
   * Create line mark configuration
   */
  private createLineMarkConfiguration(): any {
    return {
      type: 'line',
      point: true,
      interpolate: 'monotone',
    };
  }

  /**
   * Create line encoding mapping
   */
  private createLineEncodingMapping(variables: string[], data: Record<string, any>[]): any {
    const getAxisType = (variable: string) => {
      if (this.isLikelyTemporal(variable, data)) return 'temporal';
      if (this.isLikelyCategorical(variable, data)) return 'ordinal';
      return 'quantitative';
    };
    
    return {
      x: {
        field: variables[0],
        type: getAxisType(variables[0]),
        title: this.formatFieldName(variables[0]),
      },
      y: {
        field: variables[1],
        type: 'quantitative',
        title: this.formatFieldName(variables[1]),
      },
      ...(variables.length > 2 && {
        color: {
          field: variables[2],
          type: 'nominal',
          title: this.formatFieldName(variables[2]),
        },
      }),
      tooltip: variables.map((v) => ({
        field: v,
        type: this.isLikelyCategorical(v, data) ? 'nominal' : 'quantitative',
      })),
    };
  }

  /**
   * Generate bar chart specification with ValidationHelpers patterns
   */
  private generateBarChartSpec(
    baseSpec: any,
    variables: string[],
    data: Record<string, any>[]
  ): any {
    this.validateBarChartInputs(baseSpec, variables, data);
    
    return {
      ...baseSpec,
      mark: 'bar',
      encoding: this.createBarEncodingMapping(variables, data),
    };
  }

  /**
   * Validate bar chart inputs using ValidationHelpers patterns
   */
  private validateBarChartInputs(
    baseSpec: any,
    variables: string[],
    data: Record<string, any>[]
  ): void {
    if (!baseSpec || typeof baseSpec !== 'object') {
      throw new ValidationError('ERR_1001', 'Base specification is required and must be an object.');
    }
    
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(data));
    
    if (variables.length < 2) {
      throw new ValidationError('ERR_1001', 'Bar chart requires at least 2 variables.');
    }
  }

  /**
   * Create bar encoding mapping
   */
  private createBarEncodingMapping(variables: string[], data: Record<string, any>[]): any {
    return {
      x: {
        field: variables[0],
        type: this.isLikelyCategorical(variables[0], data) ? 'nominal' : 'ordinal',
        title: this.formatFieldName(variables[0]),
      },
      y: {
        field: variables[1],
        type: 'quantitative',
        title: this.formatFieldName(variables[1]),
      },
      ...(variables.length > 2 && {
        color: {
          field: variables[2],
          type: 'nominal',
          title: this.formatFieldName(variables[2]),
        },
      }),
      tooltip: variables.map((v) => ({
        field: v,
        type: this.isLikelyCategorical(v, data) ? 'nominal' : 'quantitative',
      })),
    };
  }

  /**
   * Generate histogram specification
   */
  private generateHistogramSpec(
    baseSpec: any,
    variables: string[],
    options?: Record<string, any>
  ): any {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    
    return {
      ...baseSpec,
      mark: 'bar',
      encoding: {
        x: {
          field: variables[0],
          type: 'quantitative',
          title: this.formatFieldName(variables[0]),
          bin: options?.binCount ? { maxbins: options.binCount } : true,
        },
        y: {
          aggregate: 'count',
          title: 'Frequency',
        },
        tooltip: [
          { field: variables[0], bin: true, type: 'quantitative' },
          { aggregate: 'count', title: 'Count' },
        ],
      },
    };
  }

  /**
   * Generate box plot specification
   */
  private generateBoxPlotSpec(
    baseSpec: any,
    variables: string[]
  ): any {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    
    return {
      ...baseSpec,
      mark: {
        type: 'boxplot',
        extent: 'min-max',
      },
      encoding: {
        x:
          variables.length > 1
            ? {
                field: variables[1],
                type: 'nominal',
                title: this.formatFieldName(variables[1]),
              }
            : { value: 'All Data' },
        y: {
          field: variables[0],
          type: 'quantitative',
          title: this.formatFieldName(variables[0]),
          scale: { zero: false },
        },
        tooltip: {
          field: variables[0],
          type: 'quantitative',
        },
      },
    };
  }

  /**
   * Generate heatmap specification with ValidationHelpers patterns
   */
  private generateHeatmapSpec(
    baseSpec: any,
    variables: string[],
    data: Record<string, any>[]
  ): any {
    this.validateHeatmapInputs(baseSpec, variables, data);
    
    return {
      ...baseSpec,
      mark: 'rect',
      encoding: {
        x: this.buildHeatmapXAxisEncoding(variables[0], data),
        y: this.buildHeatmapYAxisEncoding(variables[1], data),
        color: this.buildHeatmapColorEncoding(variables),
        tooltip: this.buildHeatmapTooltipEncoding(variables, data),
      },
    };
  }

  /**
   * Validate heatmap inputs
   */
  private validateHeatmapInputs(baseSpec: any, variables: string[], data: Record<string, any>[]): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(data));
    
    if (!baseSpec) {
      throw new Error('Base specification is required for heatmap generation');
    }
    
    if (variables.length < 2) {
      throw new Error('Heatmap requires at least 2 variables (x and y axes)');
    }
  }

  /**
   * Build heatmap X-axis encoding
   */
  private buildHeatmapXAxisEncoding(variable: string, data: Record<string, any>[]): any {
    return {
      field: ValidationHelpers.ensureString(variable, 'x-axis variable'),
      type: this.isLikelyCategorical(variable, data) ? 'nominal' : 'ordinal',
      title: this.formatFieldName(ValidationHelpers.ensureString(variable, 'x-axis variable')),
    };
  }

  /**
   * Build heatmap Y-axis encoding
   */
  private buildHeatmapYAxisEncoding(variable: string, data: Record<string, any>[]): any {
    return {
      field: ValidationHelpers.ensureString(variable, 'y-axis variable'),
      type: this.isLikelyCategorical(variable, data) ? 'nominal' : 'ordinal',
      title: this.formatFieldName(ValidationHelpers.ensureString(variable, 'y-axis variable')),
    };
  }

  /**
   * Build heatmap color encoding
   */
  private buildHeatmapColorEncoding(variables: string[]): any {
    if (variables.length > 2) {
      return {
        field: ValidationHelpers.ensureString(variables[2], 'color variable'),
        type: 'quantitative',
        title: this.formatFieldName(ValidationHelpers.ensureString(variables[2], 'color variable')),
        scale: { scheme: 'viridis' },
      };
    } else {
      return {
        aggregate: 'count',
        type: 'quantitative',
        title: 'Count',
        scale: { scheme: 'viridis' },
      };
    }
  }

  /**
   * Build heatmap tooltip encoding
   */
  private buildHeatmapTooltipEncoding(variables: string[], data: Record<string, any>[]): any[] {
    const tooltipItems: any[] = [
      {
        field: ValidationHelpers.ensureString(variables[0], 'x-tooltip'),
        type: this.isLikelyCategorical(variables[0], data) ? 'nominal' : 'ordinal',
      },
      {
        field: ValidationHelpers.ensureString(variables[1], 'y-tooltip'),
        type: this.isLikelyCategorical(variables[1], data) ? 'nominal' : 'ordinal',
      },
    ];
    
    if (variables.length > 2) {
      tooltipItems.push({ 
        field: ValidationHelpers.ensureString(variables[2], 'color-tooltip'), 
        type: 'quantitative' 
      });
    } else {
      tooltipItems.push({ 
        aggregate: 'count' as const, 
        type: 'quantitative' as const,
        title: 'Count' 
      });
    }
    
    return tooltipItems;
  }

  /**
   * Generate pie chart specification
   */
  private generatePieChartSpec(
    baseSpec: any,
    variables: string[]
  ): any {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    
    return {
      ...baseSpec,
      mark: { type: 'arc', innerRadius: 0 },
      encoding: {
        theta: {
          field: variables.length > 1 ? variables[1] : 'count',
          type: variables.length > 1 ? 'quantitative' : 'quantitative',
          aggregate: variables.length > 1 ? 'sum' : 'count',
          title: variables.length > 1 ? this.formatFieldName(variables[1]) : 'Count',
        },
        color: {
          field: variables[0],
          type: 'nominal',
          title: this.formatFieldName(variables[0]),
        },
        tooltip: [
          { field: variables[0], type: 'nominal' },
          ...(variables.length > 1
            ? [{ field: variables[1], type: 'quantitative', aggregate: 'sum' }]
            : [{ aggregate: 'count', title: 'Count' }]),
        ],
      },
    };
  }

  /**
   * Generate violin plot specification with ValidationHelpers patterns
   */
  private generateViolinPlotSpec(
    baseSpec: any,
    variables: string[]
  ): any {
    this.validateViolinPlotInputs(baseSpec, variables);
    
    return {
      ...baseSpec,
      mark: 'violin',
      encoding: this.createViolinEncodingMapping(variables),
    };
  }

  /**
   * Validate violin plot inputs
   */
  private validateViolinPlotInputs(
    baseSpec: any,
    variables: string[]
  ): void {
    if (!baseSpec || typeof baseSpec !== 'object') {
      throw new ValidationError('ERR_1001', 'Base specification is required and must be an object.');
    }
    
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    
    if (variables.length === 0) {
      throw new ValidationError('ERR_1001', 'Violin plot requires at least 1 variable.');
    }
  }

  /**
   * Create violin encoding mapping
   */
  private createViolinEncodingMapping(variables: string[]): any {
    const hasMultipleVars = variables.length > 1;
    
    return {
      x: hasMultipleVars
        ? {
            field: variables[1],
            type: 'nominal',
            title: this.formatFieldName(variables[1]),
          }
        : { value: 'All Data' },
      y: {
        field: variables[0],
        type: 'quantitative',
        title: this.formatFieldName(variables[0]),
      },
      color: hasMultipleVars
        ? {
            field: variables[1],
            type: 'nominal',
            title: this.formatFieldName(variables[1]),
          }
        : null,
      tooltip: [
        { field: variables[0], type: 'quantitative' },
        ...(hasMultipleVars ? [{ field: variables[1], type: 'nominal' }] : []),
      ],
    };
  }

  /**
   * Generate correlation specification with ValidationHelpers patterns
   */
  private generateCorrelationSpec(
    baseSpec: any,
    variables: string[]
  ): any {
    this.validateCorrelationInputs(baseSpec, variables);
    
    return {
      ...baseSpec,
      transform: this.createCorrelationTransforms(variables),
      mark: 'rect',
      encoding: {
        x: { field: 'key', type: 'nominal' },
        y: { field: 'key', type: 'nominal' },
        color: this.buildCorrelationColorEncoding(),
        tooltip: this.buildCorrelationTooltipEncoding(),
      },
    };
  }

  /**
   * Validate correlation inputs
   */
  private validateCorrelationInputs(baseSpec: any, variables: string[]): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    
    if (!baseSpec) {
      throw new Error('Base specification is required for correlation matrix generation');
    }
    
    if (variables.length < 2) {
      throw new Error('Correlation matrix requires at least 2 variables');
    }
  }

  /**
   * Create correlation data transforms
   */
  private createCorrelationTransforms(variables: string[]): any[] {
    return [
      { flatten: variables },
      { window: [{ op: 'count', as: 'index' }] },
      { fold: variables },
      {
        joinaggregate: [
          { op: 'min', field: 'value', as: 'min' },
          { op: 'max', field: 'value', as: 'max' },
        ],
        groupby: ['key'],
      },
      {
        calculate: '(datum.value - datum.min) / (datum.max - datum.min)',
        as: 'normalized_value',
      },
    ];
  }

  /**
   * Build correlation color encoding
   */
  private buildCorrelationColorEncoding(): any {
    return {
      field: 'correlation',
      type: 'quantitative',
      scale: {
        domain: [-1, 0, 1],
        scheme: 'blueorange',
      },
    };
  }

  /**
   * Build correlation tooltip encoding
   */
  private buildCorrelationTooltipEncoding(): any[] {
    return [
      { field: 'key1', type: 'nominal' as const, title: 'Variable 1' },
      { field: 'key2', type: 'nominal' as const, title: 'Variable 2' },
      { field: 'correlation', type: 'quantitative' as const, format: '.2f' },
    ];
  }

  /**
   * Generate default specification for unknown types
   */
  private generateDefaultSpec(
    baseSpec: any,
    variables: string[]
  ): any {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    
    // Default to a simple scatter plot if the type is not recognized
    return {
      ...baseSpec,
      mark: 'point',
      encoding: {
        x: {
          field: variables[0],
          type: 'quantitative',
          scale: { zero: false },
        },
        y: {
          field: variables[1],
          type: 'quantitative',
          scale: { zero: false },
        },
      },
    };
  }

  /**
   * Helper function to format field names for display
   */
  private formatFieldName(field: string): string {
    return ValidationHelpers.formatFieldName(field);
  }

  /**
   * Helper function to guess if a field is likely categorical based on data
   */
  private isLikelyCategorical(field: string, data: Record<string, any>[]): boolean {
    return ValidationHelpers.isLikelyCategorical(field, data);
  }

  /**
   * Helper function to guess if a field is likely temporal based on data
   */
  private isLikelyTemporal(field: string, data: Record<string, any>[]): boolean {
    return ValidationHelpers.isLikelyTemporal(field, data);
  }
}
