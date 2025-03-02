import { z } from 'zod';

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
  data: Record<string, any>[],
  visualizationType: string,
  variables: string[],
  title?: string,
  includeTrendline: boolean = false,
  options?: Record<string, any>
): Promise<string> {
  // Validate inputs
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Invalid data format. Please provide an array of data objects.');
  }

  // Verify that data is valid
  if (!data.length) {
    throw new Error('Data array is empty');
  }
  
  // Verify that variables exist in the data
  const sampleDataPoint = data[0];
  if (sampleDataPoint) {
    for (const variable of variables) {
      if (!(variable in sampleDataPoint)) {
        throw new Error(
          `Variable '${variable}' not found in data. Available variables: ${Object.keys(sampleDataPoint).join(', ')}`
        );
      }
    }
  }

  // Set default title if not provided
  const visualizationTitle =
    title || `${formatVisualizationType(visualizationType)} of ${variables.join(', ')}`;

  // Generate the visualization specification
  let result = `## Data Visualization Generator: ${formatVisualizationType(visualizationType)}\n\n`;

  result += `**Variables:** ${variables.join(', ')}\n`;
  result += `**Title:** ${visualizationTitle}\n\n`;
  result += `**Data Points:** ${data.length}\n\n`;

  // Add visualization-specific details
  result += getVisualizationDetails(visualizationType, variables, data, includeTrendline, options);

  // Generate visualization specification (in this case, a Vega-Lite specification)
  const spec = generateVisualizationSpec(
    visualizationType,
    variables,
    data,
    visualizationTitle,
    includeTrendline,
    options
  );

  result += `\n### Visualization Specification (Vega-Lite)\n\n`;
  result += '```json\n';
  result += JSON.stringify(spec, null, 2);
  result += '\n```\n\n';

  // Add instructions for using the specification
  result += `### Usage Instructions\n\n`;
  result += `This Vega-Lite specification can be used in various ways:\n\n`;
  result += `1. **Online Editor:** Paste the specification into the [Vega-Lite Editor](https://vega.github.io/editor/#/)\n`;
  result += `2. **Embedding in HTML:** Use the Vega-Embed library to include this visualization in a web page\n`;
  result += `3. **Notebooks:** Visualize in Jupyter notebooks using the Altair Python library\n`;
  result += `4. **Applications:** Use the Vega-Lite runtime in JavaScript applications\n\n`;

  // Add recommended customizations
  result += `### Recommended Customizations\n\n`;
  result += getRecommendedCustomizations(visualizationType, variables);

  // Add alternative visualization suggestions
  result += `### Alternative Visualization Options\n\n`;
  result += getAlternativeVisualizations(visualizationType, variables);

  return result;
}

// Utility function to safely handle string|undefined values
function ensureString(value: string | undefined, defaultValue: string = ''): string {
  return value !== undefined ? value : defaultValue;
}

// Helper function to format visualization type for display
function formatVisualizationType(type: string): string {
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
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

// Generate details for the visualization
function getVisualizationDetails(
  type: string,
  variables: string[],
  data: Record<string, any>[],
  includeTrendline: boolean = false,
  options?: Record<string, any>
): string {
  let details = `### Visualization Details\n\n`;

  switch (type) {
    case 'scatter':
      details += `This scatter plot will visualize the relationship between ${ensureString(variables[0], 'x-variable')} and ${ensureString(variables[1], 'y-variable')}`;
      if (variables.length > 2) {
        details += `, with ${ensureString(variables[2], 'size-variable')} encoded as point size`;
      }
      if (variables.length > 3) {
        details += ` and ${ensureString(variables[3], 'color-variable')} encoded as point color`;
      }
      details += '.\n\n';

      if (includeTrendline) {
        details += `A linear regression trendline will be included to highlight the overall pattern.\n\n`;
      }

      details += `Scatter plots are ideal for showing relationships between two continuous variables and identifying patterns, clusters, or outliers.\n`;
      break;

    case 'line':
      details += `This line chart will display ${variables[0]} on the x-axis and ${variables[1]} on the y-axis`;
      if (variables.length > 2) {
        details += `, with separate lines for each category in ${variables[2]}`;
      }
      details += '.\n\n';

      details += `Line charts are excellent for showing trends over time or ordered categories, emphasizing continuity and direction of change.\n`;
      break;

    case 'bar':
      details += `This bar chart will display ${variables[0]} on the x-axis and ${variables[1]} on the y-axis`;
      if (variables.length > 2) {
        details += `, grouped by ${variables[2]}`;
      }
      details += '.\n\n';

      details += `Bar charts are effective for comparing quantities across categories and highlighting differences between groups.\n`;
      break;

    case 'histogram':
      details += `This histogram will show the distribution of ${variables[0]}`;
      if (options?.binCount) {
        details += ` with ${options.binCount} bins`;
      }
      details += '.\n\n';

      details += `Histograms are useful for understanding the shape of data distribution, central tendency, spread, and potential outliers.\n`;
      break;

    case 'box':
      details += `This box plot will show the distribution of ${variables[0]}`;
      if (variables.length > 1) {
        details += ` grouped by ${variables[1]}`;
      }
      details += '.\n\n';

      details += `Box plots display the five-number summary of data: minimum, first quartile, median, third quartile, and maximum. They're excellent for comparing distributions and identifying outliers.\n`;
      break;

    case 'heatmap':
      details += `This heatmap will show the relationship between ${variables[0]} and ${variables[1]}, with color intensity representing ${variables[2] || 'frequency/count'}.\n\n`;

      details += `Heatmaps are powerful for visualizing complex data patterns, showing the intensity of values across two categorical dimensions.\n`;
      break;

    case 'pie':
      details += `This pie chart will show the proportion of ${variables[0]} across different categories.\n\n`;

      details += `Pie charts display parts of a whole, showing the relative size of each category as a proportion of the total.\n`;
      break;

    case 'violin':
      details += `This violin plot will show the distribution of ${variables[0]}`;
      if (variables.length > 1) {
        details += ` grouped by ${variables[1]}`;
      }
      details += '.\n\n';

      details += `Violin plots combine box plots with kernel density estimates, providing a richer view of data distribution than simple box plots.\n`;
      break;

    case 'correlation':
      details += `This correlation matrix will show the relationships between ${variables.join(', ')}.\n\n`;

      details += `Correlation matrices are essential for understanding the strengths and directions of relationships between multiple variables simultaneously.\n`;
      break;

    default:
      details += `This ${type} visualization will include the variables: ${variables.join(', ')}.\n`;
  }

  return details;
}

// Generate a Vega-Lite specification based on the visualization type
function generateVisualizationSpec(
  type: string,
  variables: string[],
  data: Record<string, any>[],
  title: string,
  includeTrendline: boolean = false,
  options?: Record<string, any>
): any {
  // Base specification
  const baseSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: { values: data },
    title: title,
    width: options?.width || 600,
    height: options?.height || 400,
  };

  // Add visualization-specific configurations
  switch (type) {
    case 'scatter':
      return {
        ...baseSpec,
        mark: 'point',
        encoding: {
          x: {
            field: ensureString(variables[0], 'x'),
            type: 'quantitative',
            title: formatFieldName(ensureString(variables[0], 'x')),
            scale: { zero: false },
          },
          y: {
            field: ensureString(variables[1], 'y'),
            type: 'quantitative',
            title: formatFieldName(ensureString(variables[1], 'y')),
            scale: { zero: false },
          },
          ...(variables.length > 2 && {
            size: {
              field: ensureString(variables[2], 'size'),
              type: 'quantitative',
              title: formatFieldName(ensureString(variables[2], 'size')),
            },
          }),
          ...(variables.length > 3 && {
            color: {
              field: ensureString(variables[3], 'color'),
              type: isLikelyCategorical(ensureString(variables[3], 'color'), data) ? 'nominal' : 'quantitative',
              title: formatFieldName(ensureString(variables[3], 'color')),
            },
          }),
          tooltip: variables.map((v) => ({
            field: ensureString(v, 'variable'),
            type: isLikelyCategorical(ensureString(v, 'variable'), data) ? 'nominal' : 'quantitative',
          })),
        },
        ...(includeTrendline && {
          layer: [
            { mark: 'point' },
            {
              mark: { type: 'line', color: 'firebrick', opacity: 0.5 },
              transform: [{ 
                regression: ensureString(variables[1], 'y'), 
                on: ensureString(variables[0], 'x') 
              }],
            },
          ],
        }),
      };

    case 'line':
      return {
        ...baseSpec,
        mark: {
          type: 'line',
          point: true,
          interpolate: 'monotone',
        },
        encoding: {
          x: {
            field: variables[0],
            type: isLikelyTemporal(variables[0], data)
              ? 'temporal'
              : isLikelyCategorical(variables[0], data)
                ? 'ordinal'
                : 'quantitative',
            title: formatFieldName(variables[0]),
          },
          y: {
            field: variables[1],
            type: 'quantitative',
            title: formatFieldName(variables[1]),
          },
          ...(variables.length > 2 && {
            color: {
              field: variables[2],
              type: 'nominal',
              title: formatFieldName(variables[2]),
            },
          }),
          tooltip: variables.map((v) => ({
            field: v,
            type: isLikelyCategorical(v, data) ? 'nominal' : 'quantitative',
          })),
        },
      };

    case 'bar':
      return {
        ...baseSpec,
        mark: 'bar',
        encoding: {
          x: {
            field: variables[0],
            type: isLikelyCategorical(variables[0], data) ? 'nominal' : 'ordinal',
            title: formatFieldName(variables[0]),
          },
          y: {
            field: variables[1],
            type: 'quantitative',
            title: formatFieldName(variables[1]),
          },
          ...(variables.length > 2 && {
            color: {
              field: variables[2],
              type: 'nominal',
              title: formatFieldName(variables[2]),
            },
          }),
          tooltip: variables.map((v) => ({
            field: v,
            type: isLikelyCategorical(v, data) ? 'nominal' : 'quantitative',
          })),
        },
      };

    case 'histogram':
      return {
        ...baseSpec,
        mark: 'bar',
        encoding: {
          x: {
            field: variables[0],
            type: 'quantitative',
            title: formatFieldName(variables[0]),
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

    case 'box':
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
                  title: formatFieldName(variables[1]),
                }
              : { value: 'All Data' },
          y: {
            field: variables[0],
            type: 'quantitative',
            title: formatFieldName(variables[0]),
            scale: { zero: false },
          },
          tooltip: {
            field: variables[0],
            type: 'quantitative',
          },
        },
      };

    case 'heatmap':
      return {
        ...baseSpec,
        mark: 'rect',
        encoding: {
          x: {
            field: variables[0],
            type: isLikelyCategorical(variables[0], data) ? 'nominal' : 'ordinal',
            title: formatFieldName(variables[0]),
          },
          y: {
            field: variables[1],
            type: isLikelyCategorical(variables[1], data) ? 'nominal' : 'ordinal',
            title: formatFieldName(variables[1]),
          },
          color:
            variables.length > 2
              ? {
                  field: variables[2],
                  type: 'quantitative',
                  title: formatFieldName(variables[2]),
                  scale: { scheme: 'viridis' },
                }
              : {
                  aggregate: 'count',
                  type: 'quantitative',
                  title: 'Count',
                  scale: { scheme: 'viridis' },
                },
          tooltip: [
            {
              field: variables[0],
              type: isLikelyCategorical(variables[0], data) ? 'nominal' : 'ordinal',
            },
            {
              field: variables[1],
              type: isLikelyCategorical(variables[1], data) ? 'nominal' : 'ordinal',
            },
            ...(variables.length > 2
              ? [{ field: variables[2], type: 'quantitative' }]
              : [{ aggregate: 'count', title: 'Count' }]),
          ],
        },
      };

    case 'pie':
      return {
        ...baseSpec,
        mark: { type: 'arc', innerRadius: 0 },
        encoding: {
          theta: {
            field: variables.length > 1 ? variables[1] : 'count',
            type: variables.length > 1 ? 'quantitative' : 'quantitative',
            aggregate: variables.length > 1 ? 'sum' : 'count',
            title: variables.length > 1 ? formatFieldName(variables[1]) : 'Count',
          },
          color: {
            field: variables[0],
            type: 'nominal',
            title: formatFieldName(variables[0]),
          },
          tooltip: [
            { field: variables[0], type: 'nominal' },
            ...(variables.length > 1
              ? [{ field: variables[1], type: 'quantitative', aggregate: 'sum' }]
              : [{ aggregate: 'count', title: 'Count' }]),
          ],
        },
      };

    case 'violin':
      return {
        ...baseSpec,
        mark: 'violin',
        encoding: {
          x:
            variables.length > 1
              ? {
                  field: variables[1],
                  type: 'nominal',
                  title: formatFieldName(variables[1]),
                }
              : { value: 'All Data' },
          y: {
            field: variables[0],
            type: 'quantitative',
            title: formatFieldName(variables[0]),
          },
          color:
            variables.length > 1
              ? {
                  field: variables[1],
                  type: 'nominal',
                  title: formatFieldName(variables[1]),
                }
              : null,
          tooltip: [
            { field: variables[0], type: 'quantitative' },
            ...(variables.length > 1 ? [{ field: variables[1], type: 'nominal' }] : []),
          ],
        },
      };

    case 'correlation':
      return {
        ...baseSpec,
        transform: [
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
        ],
        mark: 'rect',
        encoding: {
          x: { field: 'key', type: 'nominal' },
          y: { field: 'key', type: 'nominal' },
          color: {
            field: 'correlation',
            type: 'quantitative',
            scale: {
              domain: [-1, 0, 1],
              scheme: 'blueorange',
            },
          },
          tooltip: [
            { field: 'key1', type: 'nominal', title: 'Variable 1' },
            { field: 'key2', type: 'nominal', title: 'Variable 2' },
            { field: 'correlation', type: 'quantitative', format: '.2f' },
          ],
        },
      };

    default:
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
}

// Helper function to format field names for display
function formatFieldName(field: string): string {
  // Convert camelCase or snake_case to title case
  return field
    .replace(/([A-Z])/g, ' $1') // Insert a space before all caps
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/^\w/, (c) => c.toUpperCase()) // Capitalize the first letter
    .trim(); // Remove any extra spaces
}

// Helper function to guess if a field is likely categorical based on data
function isLikelyCategorical(field: string, data: Record<string, any>[]): boolean {
  // First, check field name for common categorical name patterns
  const categoricalKeywords = [
    'category',
    'group',
    'type',
    'status',
    'level',
    'gender',
    'country',
    'region',
    'department',
    'class',
    'grade',
    'rating',
    'id',
    'code',
    'name',
    'campaign',
  ];

  const hasKeyword = categoricalKeywords.some((keyword) =>
    field.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasKeyword) return true;

  // Next, check the actual data - if there are few unique values compared to the total count
  // or if the values are strings, it's likely categorical
  const uniqueValues = new Set();
  let stringCount = 0;
  let totalCount = 0;

  for (const item of data) {
    if (field in item) {
      totalCount++;
      uniqueValues.add(item[field]);
      if (typeof item[field] === 'string') {
        stringCount++;
      }
    }
  }

  // If more than 50% of values are strings, likely categorical
  if (stringCount / totalCount > 0.5) return true;

  // If there are relatively few unique values (less than 20% of total), likely categorical
  if (uniqueValues.size / totalCount < 0.2) return true;

  return false;
}

// Helper function to guess if a field is likely temporal based on data
function isLikelyTemporal(field: string, data: Record<string, any>[]): boolean {
  // First, check field name for common temporal name patterns
  const temporalKeywords = [
    'date',
    'time',
    'year',
    'month',
    'day',
    'hour',
    'minute',
    'second',
    'quarter',
    'week',
    'timestamp',
  ];

  const hasKeyword = temporalKeywords.some((keyword) =>
    field.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasKeyword) return true;

  // Check if the field values look like dates
  // This is a simple check - in a real implementation, we would use more sophisticated methods
  let dateCount = 0;
  let totalCount = 0;

  for (const item of data) {
    if (field in item) {
      totalCount++;
      const value = item[field];

      // Check if the value is a Date object
      if (value instanceof Date) {
        dateCount++;
        continue;
      }

      // Check if value is a timestamp number
      if (typeof value === 'number' && value > 1000000000000) {
        // Likely a timestamp in milliseconds
        dateCount++;
        continue;
      }

      // Check if value is a date string
      if (typeof value === 'string') {
        // Simple date string check - not comprehensive
        const dateRegex = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4}/;
        if (dateRegex.test(value) || !isNaN(Date.parse(value))) {
          dateCount++;
        }
      }
    }
  }

  // If more than 50% of values appear to be dates, likely temporal
  if (dateCount / totalCount > 0.5) return true;

  return false;
}

// Helper function to get recommended customizations
function getRecommendedCustomizations(type: string, variables: string[]): string {
  let customizations = '';

  switch (type) {
    case 'scatter':
      customizations += `- Add **logarithmic scales** if the data spans several orders of magnitude\n`;
      customizations += `- Use **color encoding** to represent a categorical variable\n`;
      customizations += `- Add **interactive brushing** to explore specific regions\n`;
      customizations += `- Include **error bars** if there's uncertainty in the measurements\n`;
      break;

    case 'line':
      customizations += `- Add **area shading** below the line for additional emphasis\n`;
      customizations += `- Include **confidence intervals** as shaded regions around lines\n`;
      customizations += `- Use **different line styles** (dotted, dashed) to distinguish categories\n`;
      customizations += `- Add **data points** at each measurement for more detail\n`;
      break;

    case 'bar':
      customizations += `- Try **horizontal orientation** for long category names\n`;
      customizations += `- Use **grouped bars** for comparing across multiple categories\n`;
      customizations += `- Add **error bars** to show uncertainty or variation\n`;
      customizations += `- Sort bars by **value** rather than category name for better insight\n`;
      break;

    case 'histogram':
      customizations += `- Adjust **bin width** to better reveal the data distribution\n`;
      customizations += `- Add a **kernel density estimate** curve over the histogram\n`;
      customizations += `- Include **summary statistics** like mean and median as vertical lines\n`;
      customizations += `- Use **multiple histograms** for comparing distributions\n`;
      break;

    case 'box':
      customizations += `- Add **violin plots** alongside box plots for richer distribution view\n`;
      customizations += `- Include **individual data points** (jittered) to show the raw data\n`;
      customizations += `- Sort boxes by **median values** rather than categories\n`;
      customizations += `- Add **notches** to indicate confidence interval around the median\n`;
      break;

    case 'heatmap':
      customizations += `- Adjust the **color scheme** to emphasize specific value ranges\n`;
      customizations += `- Add **text annotations** for key cells or all cells\n`;
      customizations += `- Apply **clustering** to reorder rows and columns by similarity\n`;
      customizations += `- Use **different cell sizes** to represent an additional variable\n`;
      break;

    case 'pie':
      customizations += `- Convert to a **donut chart** by adding inner radius\n`;
      customizations += `- Use **exploded slices** to highlight important categories\n`;
      customizations += `- Add **percentage labels** to each slice\n`;
      customizations += `- Consider a **bar chart** for more accurate comparison of values\n`;
      break;

    case 'violin':
      customizations += `- Add **box plots** inside the violins for additional statistics\n`;
      customizations += `- Include **individual data points** to show the raw data\n`;
      customizations += `- Adjust **bandwidth** of the kernel density estimate\n`;
      customizations += `- Add **mean/median markers** for quick reference\n`;
      break;

    case 'correlation':
      customizations += `- Add **correlation coefficients** as text in each cell\n`;
      customizations += `- Use **hierarchical clustering** to group similar variables\n`;
      customizations += `- Add **significance markers** (*) for statistically significant correlations\n`;
      customizations += `- Use **ellipses** instead of squares to encode correlation strength\n`;
      break;

    default:
      customizations += `- Adjust **colors** to match your presentation or brand guidelines\n`;
      customizations += `- Add **interactive tooltips** with additional information\n`;
      customizations += `- Consider **faceting** to split the visualization across multiple panels\n`;
      customizations += `- Include **annotations** for important data points or patterns\n`;
  }

  return customizations;
}

// Helper function to get alternative visualization suggestions
function getAlternativeVisualizations(type: string, variables: string[]): string {
  let alternatives = '';

  switch (type) {
    case 'scatter':
      alternatives += `- **Bubble chart**: Add a third dimension using circle size\n`;
      alternatives += `- **Connected scatter plot**: Connect points in sequence to show trajectory\n`;
      alternatives += `- **Hex bin plot**: For large datasets to avoid overplotting\n`;
      alternatives += `- **Contour plot**: To show density of points in different regions\n`;
      break;

    case 'line':
      alternatives += `- **Area chart**: To emphasize cumulative values\n`;
      alternatives += `- **Stacked area chart**: To show part-to-whole relationships over time\n`;
      alternatives += `- **Slope graph**: To compare two time points across multiple categories\n`;
      alternatives += `- **Spark lines**: For compact, inline trend visualization\n`;
      break;

    case 'bar':
      alternatives += `- **Stacked bar chart**: To show part-to-whole relationships\n`;
      alternatives += `- **Lollipop chart**: Cleaner alternative to bars for certain data\n`;
      alternatives += `- **Pyramid chart**: For population demographics or hierarchical data\n`;
      alternatives += `- **Dot plot**: For emphasizing individual values rather than bars\n`;
      break;

    case 'histogram':
      alternatives += `- **Density plot**: Smoother representation of distribution\n`;
      alternatives += `- **Cumulative distribution function**: To show percentiles\n`;
      alternatives += `- **Q-Q plot**: To compare distribution to normal distribution\n`;
      alternatives += `- **Ridgeline plot**: For comparing distributions across categories\n`;
      break;

    case 'box':
      alternatives += `- **Violin plot**: To show full distribution shape\n`;
      alternatives += `- **Beeswarm plot**: To show individual data points without overlap\n`;
      alternatives += `- **Ridgeline plot**: For comparing distributions across categories\n`;
      alternatives += `- **Letter-value plot**: For large datasets with more quantile information\n`;
      break;

    case 'heatmap':
      alternatives += `- **Tile map**: Geographic heatmap if data has spatial component\n`;
      alternatives += `- **Calendar heatmap**: For time-based data showing patterns by day/week/month\n`;
      alternatives += `- **Correlation matrix**: Specifically for correlation values\n`;
      alternatives += `- **Parallel coordinates**: For seeing relationships across multiple dimensions\n`;
      break;

    case 'pie':
      alternatives += `- **Bar chart**: More precise for value comparisons\n`;
      alternatives += `- **Treemap**: Better for hierarchical data or many categories\n`;
      alternatives += `- **Waffle chart**: Grid of squares where each represents a percentage\n`;
      alternatives += `- **Nightingale/Rose chart**: Circular display with varying radius\n`;
      break;

    case 'violin':
      alternatives += `- **Box plot**: For more emphasis on key statistics\n`;
      alternatives += `- **Beeswarm plot**: To show individual data points\n`;
      alternatives += `- **Strip plot**: To show raw data distribution\n`;
      alternatives += `- **Ridgeline plot**: For comparing distributions across categories\n`;
      break;

    case 'correlation':
      alternatives += `- **Scatter plot matrix**: For pairwise relationships between variables\n`;
      alternatives += `- **Network diagram**: To visualize strongest correlations as a graph\n`;
      alternatives += `- **Parallel coordinates**: For seeing relationships across multiple dimensions\n`;
      alternatives += `- **MDS or PCA plot**: To visualize similarity between variables in 2D space\n`;
      break;

    default:
      alternatives += `- Consider multiple visualization types to highlight different aspects of your data\n`;
      alternatives += `- Interactive dashboards with linked views can provide more comprehensive insights\n`;
      alternatives += `- Custom visualizations might be needed for specialized data or analysis requirements\n`;
  }

  return alternatives;
}
