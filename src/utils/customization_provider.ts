import { ValidationHelpers } from './validation_helpers.js';

/**
 * CustomizationProvider
 * 
 * Handles chart customization suggestions and alternative visualization recommendations.
 * Provides focused responsibility for customization logic and alternative chart types.
 * Integrates ValidationHelpers patterns for input validation and early returns.
 */
export class CustomizationProvider {
  /**
   * Get recommended customizations for a specific visualization type
   * @param type - The visualization type (scatter, line, bar, etc.)
   * @param variables - Array of variable names being visualized
   * @returns String containing customization recommendations
   */
  public getRecommendedCustomizations(type: string, variables: string[]): string {
    // Apply ValidationHelpers early return patterns
    this.validateCustomizationType(type);
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    
    const customizationMapping = this.createCustomizationMapping();
    
    // Use mapping for cleaner logic instead of long switch statement
    const customizationFunction = customizationMapping[type];
    if (customizationFunction) {
      return customizationFunction();
    }
    
    // Fallback for unknown types
    return this.getDefaultCustomizations();
  }

  /**
   * Get alternative visualization suggestions for a specific visualization type
   * @param type - The visualization type (scatter, line, bar, etc.)
   * @param variables - Array of variable names being visualized
   * @returns String containing alternative visualization recommendations
   */
  public getAlternativeVisualizations(type: string, variables: string[]): string {
    // Apply ValidationHelpers early return patterns
    this.validateAlternativeType(type);
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateDataArray(variables));
    
    const alternativeMapping = this.createAlternativeMapping();
    
    // Use mapping for cleaner logic instead of long switch statement
    const alternativeFunction = alternativeMapping[type];
    if (alternativeFunction) {
      return alternativeFunction();
    }
    
    // Fallback for unknown types
    return this.getDefaultAlternatives();
  }

  /**
   * Create mapping of visualization types to customization functions
   * @returns Record mapping visualization types to customization functions
   */
  private createCustomizationMapping(): Record<string, () => string> {
    return {
      scatter: () => this.getScatterCustomizations(),
      line: () => this.getLineCustomizations(),
      bar: () => this.getBarCustomizations(),
      histogram: () => this.getHistogramCustomizations(),
      box: () => this.getBoxCustomizations(),
      heatmap: () => this.getHeatmapCustomizations(),
      pie: () => this.getPieCustomizations(),
      violin: () => this.getViolinCustomizations(),
      correlation: () => this.getCorrelationCustomizations(),
    };
  }

  /**
   * Create mapping of visualization types to alternative functions
   * @returns Record mapping visualization types to alternative functions
   */
  private createAlternativeMapping(): Record<string, () => string> {
    return {
      scatter: () => this.getScatterAlternatives(),
      line: () => this.getLineAlternatives(),
      bar: () => this.getBarAlternatives(),
      histogram: () => this.getHistogramAlternatives(),
      box: () => this.getBoxAlternatives(),
      heatmap: () => this.getHeatmapAlternatives(),
      pie: () => this.getPieAlternatives(),
      violin: () => this.getViolinAlternatives(),
      correlation: () => this.getCorrelationAlternatives(),
    };
  }

  /**
   * Validate customization type input using ValidationHelpers patterns
   * @param type - Visualization type to validate
   */
  private validateCustomizationType(type: string): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(type));
  }

  /**
   * Validate alternative type input using ValidationHelpers patterns
   * @param type - Visualization type to validate
   */
  private validateAlternativeType(type: string): void {
    ValidationHelpers.throwIfInvalid(ValidationHelpers.validateNonEmptyString(type));
  }

  // Customization functions for each visualization type

  private getScatterCustomizations(): string {
    let customizations = '';
    customizations += `- Add **logarithmic scales** if the data spans several orders of magnitude\n`;
    customizations += `- Use **color encoding** to represent a categorical variable\n`;
    customizations += `- Add **interactive brushing** to explore specific regions\n`;
    customizations += `- Include **error bars** if there's uncertainty in the measurements\n`;
    return customizations;
  }

  private getLineCustomizations(): string {
    let customizations = '';
    customizations += `- Add **area shading** below the line for additional emphasis\n`;
    customizations += `- Include **confidence intervals** as shaded regions around lines\n`;
    customizations += `- Use **different line styles** (dotted, dashed) to distinguish categories\n`;
    customizations += `- Add **data points** at each measurement for more detail\n`;
    return customizations;
  }

  private getBarCustomizations(): string {
    let customizations = '';
    customizations += `- Try **horizontal orientation** for long category names\n`;
    customizations += `- Use **grouped bars** for comparing across multiple categories\n`;
    customizations += `- Add **error bars** to show uncertainty or variation\n`;
    customizations += `- Sort bars by **value** rather than category name for better insight\n`;
    return customizations;
  }

  private getHistogramCustomizations(): string {
    let customizations = '';
    customizations += `- Adjust **bin width** to better reveal the data distribution\n`;
    customizations += `- Add a **kernel density estimate** curve over the histogram\n`;
    customizations += `- Include **summary statistics** like mean and median as vertical lines\n`;
    customizations += `- Use **multiple histograms** for comparing distributions\n`;
    return customizations;
  }

  private getBoxCustomizations(): string {
    let customizations = '';
    customizations += `- Add **violin elements** to show distribution shape\n`;
    customizations += `- Include **individual data points** as overlays\n`;
    customizations += `- Use **notched boxes** to show confidence intervals around median\n`;
    customizations += `- Add **different colors** for each group in side-by-side comparisons\n`;
    return customizations;
  }

  private getHeatmapCustomizations(): string {
    let customizations = '';
    customizations += `- Use **diverging color scales** for data that has a meaningful center point\n`;
    customizations += `- Add **cell borders** for better readability\n`;
    customizations += `- Include **text annotations** in cells to show exact values\n`;
    customizations += `- Try **clustering** to group similar rows and columns\n`;
    return customizations;
  }

  private getPieCustomizations(): string {
    let customizations = '';
    customizations += `- Limit to **5-7 categories** for optimal readability\n`;
    customizations += `- Start the largest slice at **12 o'clock** position\n`;
    customizations += `- Use **donut chart** variant to add central text or metrics\n`;
    customizations += `- Add **percentage labels** instead of relying only on legend\n`;
    return customizations;
  }

  private getViolinCustomizations(): string {
    let customizations = '';
    customizations += `- Add **box plot elements** inside violins for quartile information\n`;
    customizations += `- Use **split violins** to compare two groups side by side\n`;
    customizations += `- Include **individual data points** as overlays\n`;
    customizations += `- Adjust **bandwidth** to control smoothness of distribution\n`;
    return customizations;
  }

  private getCorrelationCustomizations(): string {
    let customizations = '';
    customizations += `- Use **diverging color scale** (blue-white-red) for correlation values\n`;
    customizations += `- Add **correlation coefficients** as text in each cell\n`;
    customizations += `- Use **hierarchical clustering** to group similar variables\n`;
    customizations += `- Add **significance markers** (*) for statistically significant correlations\n`;
    customizations += `- Use **ellipses** instead of squares to encode correlation strength\n`;
    return customizations;
  }

  private getDefaultCustomizations(): string {
    let customizations = '';
    customizations += `- Adjust **colors** to match your presentation or brand guidelines\n`;
    customizations += `- Add **interactive tooltips** with additional information\n`;
    customizations += `- Consider **faceting** to split the visualization across multiple panels\n`;
    customizations += `- Include **annotations** for important data points or patterns\n`;
    return customizations;
  }

  // Alternative visualization functions for each type

  private getScatterAlternatives(): string {
    let alternatives = '';
    alternatives += `- **Bubble chart**: Add a third dimension using circle size\n`;
    alternatives += `- **Connected scatter plot**: Connect points in sequence to show trajectory\n`;
    alternatives += `- **Hex bin plot**: For large datasets to avoid overplotting\n`;
    alternatives += `- **Contour plot**: To show density of points in different regions\n`;
    return alternatives;
  }

  private getLineAlternatives(): string {
    let alternatives = '';
    alternatives += `- **Area chart**: To emphasize cumulative values\n`;
    alternatives += `- **Stacked area chart**: To show part-to-whole relationships over time\n`;
    alternatives += `- **Slope graph**: To compare two time points across multiple categories\n`;
    alternatives += `- **Spark lines**: For compact, inline trend visualization\n`;
    return alternatives;
  }

  private getBarAlternatives(): string {
    let alternatives = '';
    alternatives += `- **Stacked bar chart**: To show part-to-whole relationships\n`;
    alternatives += `- **Lollipop chart**: Cleaner alternative to bars for certain data\n`;
    alternatives += `- **Pyramid chart**: For population demographics or hierarchical data\n`;
    alternatives += `- **Dot plot**: For emphasizing individual values rather than bars\n`;
    return alternatives;
  }

  private getHistogramAlternatives(): string {
    let alternatives = '';
    alternatives += `- **Density plot**: Smoother representation of distribution\n`;
    alternatives += `- **Cumulative distribution function**: To show percentiles\n`;
    alternatives += `- **Q-Q plot**: To compare distribution to normal distribution\n`;
    alternatives += `- **Ridgeline plot**: For comparing distributions across categories\n`;
    return alternatives;
  }

  private getBoxAlternatives(): string {
    let alternatives = '';
    alternatives += `- **Violin plot**: To show full distribution shape\n`;
    alternatives += `- **Beeswarm plot**: To show individual data points without overlap\n`;
    alternatives += `- **Ridgeline plot**: For comparing distributions across categories\n`;
    alternatives += `- **Letter-value plot**: For large datasets with more quantile information\n`;
    return alternatives;
  }

  private getHeatmapAlternatives(): string {
    let alternatives = '';
    alternatives += `- **Chord diagram**: For flow data between categories\n`;
    alternatives += `- **Calendar heatmap**: For time-based data showing patterns by day/week/month\n`;
    alternatives += `- **Correlation matrix**: Specifically for correlation values\n`;
    alternatives += `- **Parallel coordinates**: For seeing relationships across multiple dimensions\n`;
    return alternatives;
  }

  private getPieAlternatives(): string {
    let alternatives = '';
    alternatives += `- **Bar chart**: More precise for value comparisons\n`;
    alternatives += `- **Treemap**: Better for hierarchical data or many categories\n`;
    alternatives += `- **Waffle chart**: Grid of squares where each represents a percentage\n`;
    alternatives += `- **Nightingale/Rose chart**: Circular display with varying radius\n`;
    return alternatives;
  }

  private getViolinAlternatives(): string {
    let alternatives = '';
    alternatives += `- **Box plot**: For more emphasis on key statistics\n`;
    alternatives += `- **Beeswarm plot**: To show individual data points\n`;
    alternatives += `- **Strip plot**: To show raw data distribution\n`;
    alternatives += `- **Ridgeline plot**: For comparing distributions across categories\n`;
    return alternatives;
  }

  private getCorrelationAlternatives(): string {
    let alternatives = '';
    alternatives += `- **Scatter plot matrix**: For pairwise relationships between variables\n`;
    alternatives += `- **Network diagram**: To visualize strongest correlations as a graph\n`;
    alternatives += `- **Parallel coordinates**: For seeing relationships across multiple dimensions\n`;
    alternatives += `- **MDS or PCA plot**: To visualize similarity between variables in 2D space\n`;
    return alternatives;
  }

  private getDefaultAlternatives(): string {
    let alternatives = '';
    alternatives += `- Consider multiple visualization types to highlight different aspects of your data\n`;
    alternatives += `- Interactive dashboards with linked views can provide more comprehensive insights\n`;
    alternatives += `- Custom visualizations might be needed for specialized data or analysis requirements\n`;
    return alternatives;
  }
}
