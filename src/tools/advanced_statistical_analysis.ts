import { z } from "zod";
import * as mathjs from "mathjs";

// Advanced Statistical Analysis Schema
export const advancedStatisticalAnalysisSchema = z.object({
  datasetId: z.string().describe("Unique identifier for the dataset"),
  analysisType: z.enum([
    "descriptive", 
    "correlation"
  ]).describe("Type of statistical analysis to perform")
});

// Implement core statistical functions
export function calculateDescriptiveStatistics(data: number[]) {
  return {
    mean: mathjs.mean(data),
    median: mathjs.median(data),
    standardDeviation: mathjs.std(data),
    variance: mathjs.variance(data),
    min: mathjs.min(data),
    max: mathjs.max(data)
  };
}

export function calculateCorrelation(x: number[], y: number[]) {
  if (x.length !== y.length) {
    throw new Error("Input arrays must have the same length");
  }

  const meanX = mathjs.mean(x);
  const meanY = mathjs.mean(y);
  
  const numerator = x.reduce((sum, xi, i) => 
    sum + (xi - meanX) * (y[i] - meanY), 0);
  
  const denominatorX = Math.sqrt(x.reduce((sum, xi) => 
    sum + Math.pow(xi - meanX, 2), 0));
  
  const denominatorY = Math.sqrt(y.reduce((sum, yi) => 
    sum + Math.pow(yi - meanY, 2), 0));
  
  return numerator / (denominatorX * denominatorY);
}

// Main analysis function
export async function advancedAnalyzeDataset(
  datasetId: string, 
  analysisType: string
): Promise<string> {
  // Mock datasets for demonstration
  const mockDatasets = {
    "sales_quarterly": [
      { quarter: "Q1", revenue: 100000, marketing_spend: 15000 },
      { quarter: "Q2", revenue: 125000, marketing_spend: 18000 },
      { quarter: "Q3", revenue: 110000, marketing_spend: 16000 },
      { quarter: "Q4", revenue: 150000, marketing_spend: 22000 }
    ],
    "customer_metrics": [
      { age: 25, income: 50000, purchase_value: 1200 },
      { age: 35, income: 75000, purchase_value: 2500 },
      { age: 45, income: 100000, purchase_value: 3800 },
      { age: 55, income: 125000, purchase_value: 5000 }
    ]
  };

  const dataset = mockDatasets[datasetId];
  
  if (!dataset) {
    throw new Error(`Dataset '${datasetId}' not found`);
  }

  // Extract numeric columns for analysis
  const numericColumns = Object.keys(dataset[0])
    .filter(key => 
      typeof dataset[0][key] === 'number' && 
      key !== 'quarter' // Exclude non-numeric identifiers
    );

  let result = `# Advanced Statistical Analysis for ${datasetId}\n\n`;

  if (analysisType === "descriptive") {
    numericColumns.forEach(column => {
      const values = dataset.map(item => item[column]);
      const stats = calculateDescriptiveStatistics(values);
      
      result += `## ${column} - Descriptive Statistics\n\n`;
      result += `- **Mean**: ${stats.mean.toFixed(2)}\n`;
      result += `- **Median**: ${stats.median.toFixed(2)}\n`;
      result += `- **Standard Deviation**: ${stats.standardDeviation.toFixed(2)}\n`;
      result += `- **Variance**: ${stats.variance.toFixed(2)}\n`;
      result += `- **Min**: ${stats.min}\n`;
      result += `- **Max**: ${stats.max}\n\n`;
    });
  } else if (analysisType === "correlation") {
    result += `## Correlation Analysis\n\n`;
    
    // Compute correlation between all numeric column pairs
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        
        const x = dataset.map(item => item[col1]);
        const y = dataset.map(item => item[col2]);
        
        const correlation = calculateCorrelation(x, y);
        
        result += `### Correlation between ${col1} and ${col2}\n\n`;
        result += `**Correlation Coefficient**: ${correlation.toFixed(4)}\n\n`;
        result += `*Interpretation*: ${
          Math.abs(correlation) > 0.7 
            ? "Strong correlation" 
            : Math.abs(correlation) > 0.3 
              ? "Moderate correlation" 
              : "Weak correlation"
        }\n\n`;
      }
    }
  }

  return result;
}
