import { describe, it, expect } from '@jest/globals';
import { analyzeDataset } from '../analyze_dataset.js';

describe('Analyze Dataset', () => {
  it('should analyze a simple dataset with summary', async () => {
    const data = [1, 2, 3, 4, 5];
    const result = await analyzeDataset(data, 'summary');
    
    expect(result).toContain("Data Summary");
    expect(result).toContain("This dataset contains 5 values");
    expect(result).toContain("Average value: 3.00");
  });
  
  it('should analyze a simple dataset with stats', async () => {
    const data = [1, 2, 3, 4, 5];
    const result = await analyzeDataset(data, 'stats');
    
    expect(result).toContain("Statistical Analysis");
    expect(result).toContain("Count: 5 values");
    expect(result).toContain("Mean: 3.00");
  });
});