import { describe, it, expect } from '@jest/globals';
import { dataVisualizationGenerator } from '../data_visualization_generator.js';
import { VisualizationDetailProvider } from '../../utils/visualization_detail_provider.js';

describe('dataVisualizationGenerator', () => {
  it('renders the chart type info as prose, not [object Object]', async () => {
    const result = await dataVisualizationGenerator({
      data: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 6 },
      ],
      visualizationType: 'scatter',
      variables: ['x', 'y'],
    });

    expect(result).not.toContain('[object Object]');
    expect(result).toContain('Scatter Plot');
    expect(result).toContain('**Best For:**');
    expect(result).toContain('Exploring relationships between two continuous variables');
    expect(result).toContain('**Limitations:**');
  });
});

describe('VisualizationDetailProvider.formatVisualizationTypeInfo', () => {
  const provider = new VisualizationDetailProvider();

  it('formats a known type as markdown sections', () => {
    const section = provider.formatVisualizationTypeInfo('scatter');
    expect(section).not.toContain('[object Object]');
    expect(section).toContain('### About Scatter Plot');
    expect(section).toContain('**Best For:**');
    expect(section).toContain('**Required Variables:**');
    expect(section).toContain('**Examples:**');
  });

  it('formats the default info for an unmapped type (unreachable via the tool)', () => {
    // Unknown types are rejected by validateGeneralInputs before the formatter runs in
    // the tool, so the default-info path is only reachable by calling the provider directly.
    const section = provider.formatVisualizationTypeInfo('sankey');
    expect(section).not.toContain('[object Object]');
    expect(section).toContain('### About');
    expect(section).toContain('**Best For:**');
    expect(section).toContain('General data visualization');
  });
});
