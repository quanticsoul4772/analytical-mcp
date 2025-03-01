import { z } from "zod";
import * as math from "mathjs";

// Type definition for our mock datasets
type Dataset = number[];

// Mock dataset storage
const mockDatasets: Record<string, Dataset> = {
  "sales2024": [100, 200, 150, 300, 250, 175, 225, 275, 190, 310, 280, 320],
  "customerFeedback": [5, 4, 3, 5, 4, 2, 5, 3, 4, 5, 3, 4, 5],
  "marketingQ1": [15000, 22000, 18000, 25000, 17000, 28000, 20000],
  "productMetrics": [92, 88, 95, 79, 83, 91, 87, 93, 89, 85, 90, 86, 91, 94],
  "operationalCosts": [4500, 4800, 5200, 4700, 5100, 4900, 5300, 5000, 4600, 5500]
};

// Schema for the tool parameters
export const analyzeDatasetSchema = z.object({
  datasetId: z.string().describe("ID of the dataset to analyze"),
  analysisType: z.enum(["summary", "stats"]).default("summary").describe("Type of analysis to perform")
});

// Tool implementation
export async function analyzeDataset(datasetId: string, analysisType: string): Promise<string> {
  const data = mockDatasets[datasetId];
  
  if (!data) {
    throw new Error(`Dataset with ID '${datasetId}' not found. Available datasets: ${Object.keys(mockDatasets).join(", ")}`);
  }

  if (analysisType === "stats") {
    // Perform statistical analysis
    const meanCalc = math.mean(data);
    const medianCalc = math.median(data);
    const minCalc = math.min(...data);
    const maxCalc = math.max(...data);
    const stdCalc = math.std(data, "uncorrected");
    // Calculate variance manually
    const varianceCalc = calculateVariance(data);
    const sumCalc = math.sum(data);
    const quartiles = getQuartiles(data);
    
    // Ensure numeric values
    const mean = Number(meanCalc);
    const median = Number(medianCalc);
    const min = Number(minCalc);
    const max = Number(maxCalc);
    const std = Number(stdCalc);
    const variance = Number(varianceCalc);
    const sum = Number(sumCalc);
    
    return `
## Statistical Analysis of Dataset: ${datasetId}

- **Count**: ${data.length} values
- **Sum**: ${sum.toFixed(2)}
- **Range**: ${min} to ${max}
- **Quartiles**: 
  - Q1 (25%): ${quartiles.q1.toFixed(2)}
  - Q2 (50%, median): ${quartiles.q2.toFixed(2)}
  - Q3 (75%): ${quartiles.q3.toFixed(2)}
- **Central Tendency**:
  - Mean: ${mean.toFixed(2)}
  - Median: ${median.toFixed(2)}
- **Dispersion**:
  - Standard Deviation: ${std.toFixed(2)}
  - Variance: ${variance.toFixed(2)}
  - Coefficient of Variation: ${(std / mean * 100).toFixed(2)}%
    `;
  } else {
    // Provide a general summary
    const meanCalc = math.mean(data);
    const minCalc = math.min(...data);
    const maxCalc = math.max(...data);
    const sumCalc = math.sum(data);
    
    // Ensure numeric values
    const mean = Number(meanCalc);
    const min = Number(minCalc);
    const max = Number(maxCalc);
    const sum = Number(sumCalc);
    
    return `
## Summary of Dataset: ${datasetId}

This dataset contains ${data.length} values.

**Overview:**
- Average value: ${mean.toFixed(2)}
- Lowest value: ${min}
- Highest value: ${max}
- Total sum: ${sum.toFixed(2)}

**Sample Data:**
${data.slice(0, 5).join(", ")}${data.length > 5 ? ", ..." : ""}
    `;
  }
}

// Helper function to calculate quartiles
function getQuartiles(arr: number[]): { q1: number, q2: number, q3: number } {
  const sorted = [...arr].sort((a, b) => a - b);
  const q2 = Number(math.median(sorted));
  
  const lowerHalf = sorted.slice(0, Math.floor(sorted.length / 2));
  const upperHalf = sorted.length % 2 === 0 
    ? sorted.slice(Math.floor(sorted.length / 2))
    : sorted.slice(Math.floor(sorted.length / 2) + 1);
  
  const q1 = Number(math.median(lowerHalf));
  const q3 = Number(math.median(upperHalf));
  
  return { q1, q2, q3 };
}

// Helper function to calculate variance
function calculateVariance(arr: number[]): number {
  if (arr.length === 0) return 0;
  
  const mean = Number(math.mean(arr));
  const squares = arr.map(x => Math.pow(x - mean, 2));
  const sum = squares.reduce((sum, square) => sum + square, 0);
  
  return sum / arr.length;
}
