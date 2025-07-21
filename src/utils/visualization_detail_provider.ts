import { ValidationHelpers } from './validation_helpers.js';
import { ValidationError } from './errors.js';

/**
 * VisualizationDetailProvider - Handles chart type descriptions, capabilities, and metadata
 * 
 * Responsibilities:
 * - Provide chart type descriptions and capabilities
 * - Generate usage recommendations
 * - Handle feature explanations
 * - Manage type-specific metadata
 * - Apply ValidationHelpers patterns for input validation
 * 
 * Part of Phase 4 god class decomposition using ValidationHelpers + provider pattern methodology
 */
export class VisualizationDetailProvider {

  /**
   * Get detailed information about a visualization type
   */
  getVisualizationTypeInfo(type: string): any {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(type));
    
    const infoMapping = this.createVisualizationInfoMapping();
    const typeInfo = infoMapping[type.toLowerCase()];
    
    if (!typeInfo) {
      return this.getDefaultVisualizationInfo(type);
    }
    
    return typeInfo;
  }

  /**
   * Create mapping for visualization type information
   */
  private createVisualizationInfoMapping(): Record<string, any> {
    return {
      scatter: this.getScatterPlotInfo(),
      line: this.getLineChartInfo(),
      bar: this.getBarChartInfo(),
      histogram: this.getHistogramInfo(),
      box: this.getBoxPlotInfo(),
      heatmap: this.getHeatmapInfo(),
      pie: this.getPieChartInfo(),
      violin: this.getViolinPlotInfo(),
      correlation: this.getCorrelationInfo(),
    };
  }

  /**
   * Get scatter plot information and capabilities
   */
  private getScatterPlotInfo(): any {
    return {
      name: 'Scatter Plot',
      description: 'A scatter plot displays values for two or more variables as a collection of points. Each point represents an observation in the dataset.',
      bestFor: [
        'Exploring relationships between two continuous variables',
        'Identifying patterns, clusters, or outliers in data',
        'Comparing distributions across different groups',
        'Visualizing correlations between variables'
      ],
      requiredVariables: {
        minimum: 2,
        maximum: 4,
        types: ['continuous', 'discrete']
      },
      optionalFeatures: [
        'Size encoding (third variable)',
        'Color encoding (fourth variable)',
        'Trendline overlay',
        'Faceting by categorical variables'
      ],
      limitations: [
        'Can become cluttered with too many points',
        'Difficult to see overlapping points',
        'May not show temporal patterns well'
      ],
      examples: [
        'Height vs Weight relationship',
        'Sales vs Marketing spend correlation',
        'Temperature vs Energy consumption analysis'
      ]
    };
  }

  /**
   * Get line chart information and capabilities
   */
  private getLineChartInfo(): any {
    return {
      name: 'Line Chart',
      description: 'A line chart displays information as a series of data points connected by straight line segments. Ideal for showing trends over time.',
      bestFor: [
        'Showing trends and patterns over time',
        'Comparing multiple time series',
        'Displaying continuous data progression',
        'Highlighting changes and fluctuations'
      ],
      requiredVariables: {
        minimum: 2,
        maximum: 3,
        types: ['temporal', 'continuous', 'ordinal']
      },
      optionalFeatures: [
        'Multiple series with color encoding',
        'Point markers for data values',
        'Smooth interpolation',
        'Area fill under lines'
      ],
      limitations: [
        'Not suitable for non-sequential data',
        'Can be misleading with missing data points',
        'Too many lines can create visual clutter'
      ],
      examples: [
        'Stock price movements over time',
        'Website traffic trends',
        'Temperature changes throughout the year'
      ]
    };
  }

  /**
   * Get bar chart information and capabilities
   */
  private getBarChartInfo(): any {
    return {
      name: 'Bar Chart',
      description: 'A bar chart uses rectangular bars with heights proportional to the values they represent. Excellent for comparing discrete categories.',
      bestFor: [
        'Comparing values across different categories',
        'Showing rankings and relative magnitudes',
        'Displaying survey results or counts',
        'Visualizing categorical data distributions'
      ],
      requiredVariables: {
        minimum: 2,
        maximum: 3,
        types: ['categorical', 'continuous']
      },
      optionalFeatures: [
        'Horizontal or vertical orientation',
        'Grouped bars for multiple series',
        'Stacked bars for composition',
        'Color encoding for additional dimensions'
      ],
      limitations: [
        'Limited to categorical x-axis data',
        'Difficult to show precise values',
        'Can become cluttered with many categories'
      ],
      examples: [
        'Sales by product category',
        'Survey responses by demographic',
        'Performance metrics by team'
      ]
    };
  }

  /**
   * Get histogram information and capabilities
   */
  private getHistogramInfo(): any {
    return {
      name: 'Histogram',
      description: 'A histogram shows the distribution of a continuous variable by dividing data into bins and displaying the frequency of observations in each bin.',
      bestFor: [
        'Understanding data distribution patterns',
        'Identifying skewness and outliers',
        'Comparing distributions between groups',
        'Quality control and process analysis'
      ],
      requiredVariables: {
        minimum: 1,
        maximum: 2,
        types: ['continuous']
      },
      optionalFeatures: [
        'Adjustable bin count and width',
        'Overlay with normal distribution curve',
        'Multiple histograms for comparison',
        'Density scaling instead of frequency'
      ],
      limitations: [
        'Bin size affects appearance significantly',
        'Only works with continuous numeric data',
        'Can hide important details in the data'
      ],
      examples: [
        'Distribution of customer ages',
        'Frequency of response times',
        'Grade distributions in education'
      ]
    };
  }

  /**
   * Get box plot information and capabilities
   */
  private getBoxPlotInfo(): any {
    return {
      name: 'Box Plot',
      description: 'A box plot displays the five-number summary of a dataset: minimum, first quartile, median, third quartile, and maximum.',
      bestFor: [
        'Comparing distributions across groups',
        'Identifying outliers and data spread',
        'Showing statistical summaries',
        'Quality control and process monitoring'
      ],
      requiredVariables: {
        minimum: 1,
        maximum: 2,
        types: ['continuous', 'categorical']
      },
      optionalFeatures: [
        'Individual data points overlay',
        'Notched boxes for confidence intervals',
        'Violin plot combination',
        'Multiple grouping variables'
      ],
      limitations: [
        'Hides detailed distribution shape',
        'Less intuitive for general audiences',
        'May not show multimodal distributions well'
      ],
      examples: [
        'Salary distributions by department',
        'Test scores across different schools',
        'Response times by server location'
      ]
    };
  }

  /**
   * Get heatmap information and capabilities
   */
  private getHeatmapInfo(): any {
    return {
      name: 'Heatmap',
      description: 'A heatmap uses color intensity to represent values in a two-dimensional matrix, making patterns and relationships visible.',
      bestFor: [
        'Visualizing correlation matrices',
        'Showing patterns in large datasets',
        'Geographic data visualization',
        'Time-based pattern analysis'
      ],
      requiredVariables: {
        minimum: 2,
        maximum: 3,
        types: ['categorical', 'continuous']
      },
      optionalFeatures: [
        'Custom color schemes',
        'Hierarchical clustering',
        'Interactive tooltips',
        'Dendrogram overlays'
      ],
      limitations: [
        'Requires careful color scale selection',
        'Can be difficult to read precise values',
        'May not work well for sparse data'
      ],
      examples: [
        'Website user activity by time and day',
        'Gene expression data analysis',
        'Sales performance by region and quarter'
      ]
    };
  }

  /**
   * Get pie chart information and capabilities
   */
  private getPieChartInfo(): any {
    return {
      name: 'Pie Chart',
      description: 'A pie chart shows proportions of a whole using circular sectors. Each sector represents a category\'s relative contribution.',
      bestFor: [
        'Showing parts of a whole composition',
        'Displaying percentages and proportions',
        'Simple categorical comparisons',
        'Budget or resource allocation visualization'
      ],
      requiredVariables: {
        minimum: 1,
        maximum: 2,
        types: ['categorical', 'continuous']
      },
      optionalFeatures: [
        'Donut chart variation',
        'Exploded slices for emphasis',
        'Percentage labels',
        'Legend with values'
      ],
      limitations: [
        'Difficult to compare similar-sized slices',
        'Not suitable for many categories',
        'Hard to show precise values',
        'Can be misleading with 3D effects'
      ],
      examples: [
        'Market share by competitor',
        'Budget allocation by department',
        'Survey response distribution'
      ]
    };
  }

  /**
   * Get violin plot information and capabilities
   */
  private getViolinPlotInfo(): any {
    return {
      name: 'Violin Plot',
      description: 'A violin plot combines box plot summary statistics with kernel density estimation to show the full distribution shape.',
      bestFor: [
        'Showing detailed distribution shapes',
        'Comparing distributions across groups',
        'Identifying multimodal distributions',
        'Advanced statistical analysis'
      ],
      requiredVariables: {
        minimum: 1,
        maximum: 2,
        types: ['continuous', 'categorical']
      },
      optionalFeatures: [
        'Box plot overlay',
        'Individual data points',
        'Split violins for comparison',
        'Bandwidth adjustment'
      ],
      limitations: [
        'Requires understanding of density plots',
        'Can be complex for general audiences',
        'May not work well with small datasets'
      ],
      examples: [
        'Income distribution by education level',
        'Performance metrics across teams',
        'Biological measurements by species'
      ]
    };
  }

  /**
   * Get correlation matrix information and capabilities
   */
  private getCorrelationInfo(): any {
    return {
      name: 'Correlation Matrix',
      description: 'A correlation matrix visualizes the correlation coefficients between multiple variables using a color-coded heatmap.',
      bestFor: [
        'Exploring relationships between multiple variables',
        'Feature selection in data analysis',
        'Identifying multicollinearity',
        'Pattern discovery in complex datasets'
      ],
      requiredVariables: {
        minimum: 2,
        maximum: 20,
        types: ['continuous']
      },
      optionalFeatures: [
        'Hierarchical clustering of variables',
        'Significance indicators',
        'Upper/lower triangle display',
        'Custom correlation methods'
      ],
      limitations: [
        'Only shows linear relationships',
        'Can be overwhelming with many variables',
        'Requires careful interpretation'
      ],
      examples: [
        'Financial portfolio analysis',
        'Survey response correlations',
        'Scientific measurement relationships'
      ]
    };
  }

  /**
   * Get default information for unknown visualization types
   */
  private getDefaultVisualizationInfo(type: string): any {
    return {
      name: this.formatVisualizationTypeName(type),
      description: `A ${type} visualization for data analysis and exploration.`,
      bestFor: [
        'General data visualization',
        'Exploratory data analysis',
        'Pattern identification'
      ],
      requiredVariables: {
        minimum: 1,
        maximum: 10,
        types: ['any']
      },
      optionalFeatures: [
        'Customizable appearance',
        'Interactive features',
        'Export capabilities'
      ],
      limitations: [
        'May not be optimal for all data types',
        'Requires careful parameter selection'
      ],
      examples: [
        'Custom data analysis',
        'Specialized visualization needs'
      ]
    };
  }

  /**
   * Get recommended usage guidelines for a visualization type
   */
  getUsageGuidelines(type: string, variableCount: number, dataSize: number): any {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(type));
    
    const guidelines = this.createUsageGuidelinesMapping();
    const typeGuidelines = guidelines[type.toLowerCase()] || guidelines['default'];
    
    return {
      ...typeGuidelines,
      dataSpecific: this.getDataSpecificGuidelines(type, variableCount, dataSize),
      performance: this.getPerformanceGuidelines(type, dataSize)
    };
  }

  /**
   * Create mapping for usage guidelines
   */
  private createUsageGuidelinesMapping(): Record<string, any> {
    return {
      scatter: {
        preparation: 'Ensure variables are on appropriate scales. Consider log transformation for skewed data.',
        bestPractices: [
          'Use alpha transparency for overlapping points',
          'Add jitter for discrete variables',
          'Consider sampling for very large datasets'
        ]
      },
      line: {
        preparation: 'Ensure data is sorted by x-axis variable. Handle missing values appropriately.',
        bestPractices: [
          'Use consistent time intervals',
          'Consider smoothing for noisy data',
          'Limit number of lines for clarity'
        ]
      },
      bar: {
        preparation: 'Sort categories by value or logical order. Aggregate data appropriately.',
        bestPractices: [
          'Keep category labels readable',
          'Use consistent color scheme',
          'Consider horizontal bars for long labels'
        ]
      },
      default: {
        preparation: 'Clean and validate data before visualization.',
        bestPractices: [
          'Choose appropriate chart type for data',
          'Ensure data quality and completeness',
          'Consider audience and context'
        ]
      }
    };
  }

  /**
   * Get data-specific guidelines based on variable count and data characteristics
   */
  private getDataSpecificGuidelines(type: string, variableCount: number, dataSize: number): any {
    const guidelines: any = {
      variableCount: this.getVariableCountGuidance(type, variableCount),
      dataSize: this.getDataSizeGuidance(type, dataSize)
    };

    if (variableCount > 4) {
      guidelines.complexity = 'Consider dimension reduction or faceting for complex visualizations.';
    }

    if (dataSize > 10000) {
      guidelines.performance = 'Large dataset detected. Consider sampling or aggregation for better performance.';
    }

    return guidelines;
  }

  /**
   * Get guidance based on variable count
   */
  private getVariableCountGuidance(type: string, variableCount: number): string {
    if (variableCount < 2 && ['scatter', 'line', 'bar', 'heatmap'].includes(type)) {
      return 'This visualization type typically requires at least 2 variables for meaningful results.';
    }
    
    if (variableCount > 4) {
      return 'Consider using faceting or multiple visualizations to avoid overcrowding.';
    }
    
    return 'Variable count is appropriate for this visualization type.';
  }

  /**
   * Get guidance based on data size
   */
  private getDataSizeGuidance(type: string, dataSize: number): string {
    if (dataSize < 10) {
      return 'Small dataset may not show clear patterns. Consider aggregating with additional data.';
    }
    
    if (dataSize > 10000) {
      return 'Large dataset detected. Consider sampling or aggregation for better performance and clarity.';
    }
    
    return 'Data size is appropriate for this visualization.';
  }

  /**
   * Get performance guidelines based on visualization type and data size
   */
  private getPerformanceGuidelines(type: string, dataSize: number): any {
    const guidelines = {
      rendering: 'Standard rendering performance expected.',
      optimization: [] as string[],
      warnings: [] as string[]
    };

    if (dataSize > 5000) {
      guidelines.optimization.push('Consider data sampling for better interactivity');
      guidelines.optimization.push('Use canvas rendering for large point datasets');
    }

    if (dataSize > 20000) {
      guidelines.warnings.push('Very large dataset may cause performance issues');
      guidelines.optimization.push('Implement data aggregation or binning');
    }

    if (type === 'scatter' && dataSize > 1000) {
      guidelines.optimization.push('Use alpha transparency to handle overplotting');
    }

    if (type === 'correlation' && dataSize > 10000) {
      guidelines.warnings.push('Correlation calculation may be computationally intensive');
    }

    return guidelines;
  }

  /**
   * Get compatibility information for different data types
   */
  getDataTypeCompatibility(type: string): any {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(type));
    
    const compatibilityMapping = this.createDataTypeCompatibilityMapping();
    return compatibilityMapping[type.toLowerCase()] || compatibilityMapping['default'];
  }

  /**
   * Create mapping for data type compatibility
   */
  private createDataTypeCompatibilityMapping(): Record<string, any> {
    return {
      scatter: {
        supported: ['continuous', 'discrete', 'ordinal'],
        optimal: ['continuous'],
        limitations: {
          categorical: 'Requires careful encoding to avoid misleading representations',
          temporal: 'Better suited for line charts for time series data'
        }
      },
      line: {
        supported: ['continuous', 'temporal', 'ordinal'],
        optimal: ['temporal', 'ordinal'],
        limitations: {
          categorical: 'Order of categories affects interpretation significantly'
        }
      },
      bar: {
        supported: ['categorical', 'ordinal', 'discrete'],
        optimal: ['categorical'],
        limitations: {
          continuous: 'Should be binned or aggregated first'
        }
      },
      histogram: {
        supported: ['continuous'],
        optimal: ['continuous'],
        limitations: {
          categorical: 'Use bar chart instead for categorical data',
          ordinal: 'May work if values are numeric'
        }
      },
      default: {
        supported: ['any'],
        optimal: ['continuous', 'categorical'],
        limitations: {
          mixed: 'Ensure appropriate encoding for different data types'
        }
      }
    };
  }

  /**
   * Format visualization type name for display
   */
  private formatVisualizationTypeName(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1');
  }
}
