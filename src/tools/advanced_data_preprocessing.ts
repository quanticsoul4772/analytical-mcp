import { z } from "zod";
import * as mathjs from "mathjs";

// Advanced Data Preprocessing Schema
export const advancedDataPreprocessingSchema = z.object({
  // Input data can be an array of objects or numeric values
  data: z.union([
    z.array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))),
    z.array(z.number())
  ]).describe("Input data for preprocessing"),
  
  preprocessingTasks: z.object({
    // Missing Value Handling
    missingValueStrategy: z.enum([
      "remove", 
      "mean_imputation", 
      "median_imputation", 
      "mode_imputation"
    ]).optional(),
    
    // Normalization Techniques
    normalizationMethod: z.enum([
      "min_max_scaling", 
      "z_score_normalization", 
      "log_transformation"
    ]).optional(),
    
    // Outlier Handling
    outlierHandling: z.enum([
      "none", 
      "remove", 
      "cap_at_threshold"
    ]).optional(),
    
    // Categorical Encoding
    categoricalEncoding: z.enum([
      "one_hot", 
      "label", 
      "ordinal"
    ]).optional(),
    
    // Specific column for operations (if applicable)
    targetColumn: z.string().optional()
  }).optional()
});

export class AdvancedDataPreprocessor {
  // Handle missing values
  private handleMissingValues(
    data: any[], 
    strategy: string, 
    column?: string
  ): any[] {
    if (!column) {
      // If no specific column, apply to all numeric columns
      const numericColumns = this.getNumericColumns(data);
      return data.map(row => {
        const newRow = {...row};
        numericColumns.forEach(col => {
          newRow[col] = this.imputeValue(
            data.map(r => r[col]), 
            strategy
          );
        });
        return newRow;
      });
    }

    // Specific column imputation
    const columnValues = data.map(row => row[column]);
    const imputedValue = this.imputeValue(columnValues, strategy);
    
    return data.map(row => ({
      ...row,
      [column]: row[column] === undefined || row[column] === null 
        ? imputedValue 
        : row[column]
    }));
  }

  // Impute value based on strategy
  private imputeValue(values: any[], strategy: string): any {
    const numericValues = values.filter(v => typeof v === 'number');
    
    switch (strategy) {
      case 'mean_imputation':
        return mathjs.mean(numericValues);
      case 'median_imputation':
        return mathjs.median(numericValues);
      case 'mode_imputation':
        // Simple mode calculation
        const counts: Record<string, number> = {};
        values.forEach(v => {
          counts[v] = (counts[v] || 0) + 1;
        });
        return Object.entries(counts).reduce(
          (a, b) => b[1] > a[1] ? b : a
        )[0];
      default:
        throw new Error(`Unsupported imputation strategy: ${strategy}`);
    }
  }

  // Normalize data
  private normalizeData(
    data: any[], 
    method: string, 
    column?: string
  ): any[] {
    if (!column) {
      // If no specific column, apply to all numeric columns
      const numericColumns = this.getNumericColumns(data);
      return data.map(row => {
        const newRow = {...row};
        numericColumns.forEach(col => {
          newRow[col] = this.normalizeColumn(
            data.map(r => r[col]), 
            method
          );
        });
        return newRow;
      });
    }

    // Specific column normalization
    const columnValues = data.map(row => row[column]);
    const normalizedValues = this.normalizeColumn(columnValues, method);
    
    return data.map((row, index) => ({
      ...row,
      [column]: normalizedValues[index]
    }));
  }

  // Normalize column based on method
  private normalizeColumn(values: number[], method: string): number[] {
    const numericValues = values.filter(v => typeof v === 'number');
    
    switch (method) {
      case 'min_max_scaling': {
        const min = mathjs.min(numericValues);
        const max = mathjs.max(numericValues);
        return numericValues.map(v => 
          max === min ? 0 : (v - min) / (max - min)
        );
      }
      case 'z_score_normalization': {
        const mean = mathjs.mean(numericValues);
        const std = mathjs.std(numericValues);
        return numericValues.map(v => 
          std === 0 ? 0 : (v - mean) / std
        );
      }
      case 'log_transformation':
        return numericValues.map(v => 
          v > 0 ? Math.log(v) : 0
        );
      default:
        throw new Error(`Unsupported normalization method: ${method}`);
    }
  }

  // Handle outliers
  private handleOutliers(
    data: any[], 
    method: string, 
    column?: string
  ): any[] {
    if (!column) {
      // If no specific column, apply to all numeric columns
      const numericColumns = this.getNumericColumns(data);
      return data.map(row => {
        const newRow = {...row};
        numericColumns.forEach(col => {
          newRow[col] = this.handleColumnOutliers(
            data.map(r => r[col]), 
            method
          );
        });
        return newRow;
      });
    }

    // Specific column outlier handling
    const columnValues = data.map(row => row[column]);
    const processedValues = this.handleColumnOutliers(columnValues, method);
    
    return data.map((row, index) => ({
      ...row,
      [column]: processedValues[index]
    }));
  }

  // Handle outliers in a specific column
  private handleColumnOutliers(values: number[], method: string): number[] {
    const numericValues = values.filter(v => typeof v === 'number');
    
    switch (method) {
      case 'remove':
        const q1 = mathjs.quantileSeq(numericValues, 0.25);
        const q3 = mathjs.quantileSeq(numericValues, 0.75);
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        return numericValues.filter(
          v => v >= lowerBound && v <= upperBound
        );
      
      case 'cap_at_threshold':
        const lowerCap = mathjs.quantileSeq(numericValues, 0.25) - 1.5 * (mathjs.quantileSeq(numericValues, 0.75) - mathjs.quantileSeq(numericValues, 0.25));
        const upperCap = mathjs.quantileSeq(numericValues, 0.75) + 1.5 * (mathjs.quantileSeq(numericValues, 0.75) - mathjs.quantileSeq(numericValues, 0.25));
        
        return numericValues.map(v => 
          v < lowerCap ? lowerCap : 
          v > upperCap ? upperCap : 
          v
        );
      
      default:
        return numericValues;
    }
  }

  // Get numeric columns from a dataset
  private getNumericColumns(data: any[]): string[] {
    if (data.length === 0) return [];
    
    return Object.keys(data[0]).filter(key => 
      data.every(row => typeof row[key] === 'number')
    );
  }

  // Main preprocessing method
  async preprocessData(
    data: any[], 
    preprocessingTasks?: z.infer<typeof advancedDataPreprocessingSchema>['preprocessingTasks']
  ): Promise<string> {
    if (!preprocessingTasks) {
      return "## No Preprocessing Tasks Specified\n\nNo changes were made to the input data.";
    }

    let processedData = [...data];

    // Missing Value Handling
    if (preprocessingTasks.missingValueStrategy) {
      processedData = this.handleMissingValues(
        processedData, 
        preprocessingTasks.missingValueStrategy,
        preprocessingTasks.targetColumn
      );
    }

    // Normalization
    if (preprocessingTasks.normalizationMethod) {
      processedData = this.normalizeData(
        processedData, 
        preprocessingTasks.normalizationMethod,
        preprocessingTasks.targetColumn
      );
    }

    // Outlier Handling
    if (preprocessingTasks.outlierHandling && 
        preprocessingTasks.outlierHandling !== 'none') {
      processedData = this.handleOutliers(
        processedData, 
        preprocessingTasks.outlierHandling,
        preprocessingTasks.targetColumn
      );
    }

    // Categorical Encoding (placeholder for future implementation)
    // if (preprocessingTasks.categoricalEncoding) {
    //   // Implement categorical encoding logic
    // }

    // Generate markdown report
    return `# Advanced Data Preprocessing Report

## Preprocessing Tasks
${preprocessingTasks.missingValueStrategy 
  ? `- **Missing Value Strategy**: ${preprocessingTasks.missingValueStrategy}` 
  : ''}
${preprocessingTasks.normalizationMethod 
  ? `- **Normalization Method**: ${preprocessingTasks.normalizationMethod}` 
  : ''}
${preprocessingTasks.outlierHandling 
  ? `- **Outlier Handling**: ${preprocessingTasks.outlierHandling}` 
  : ''}
${preprocessingTasks.targetColumn 
  ? `- **Target Column**: ${preprocessingTasks.targetColumn}` 
  : ''}

## Processing Results
- **Initial Dataset Size**: ${data.length} records
- **Processed Dataset Size**: ${processedData.length} records
${preprocessingTasks.outlierHandling === 'remove' 
  ? `- **Outliers Removed**: ${data.length - processedData.length}` 
  : ''}

### Sample Processed Data
\`\`\`json
${JSON.stringify(processedData.slice(0, 5), null, 2)}
\`\`\`

### Data Insights
- **Columns Processed**: ${this.getNumericColumns(processedData).join(', ')}`;
  }
}

// Export for use in MCP server tools
export async function advancedPreprocessData(
  data: any[], 
  preprocessingTasks?: z.infer<typeof advancedDataPreprocessingSchema>['preprocessingTasks']
): Promise<string> {
  const preprocessor = new AdvancedDataPreprocessor();
  return await preprocessor.preprocessData(data, preprocessingTasks);
}

export const advancedDataPreprocessingTool = {
  name: "advanced_data_preprocessing",
  description: "Perform advanced data preprocessing tasks like missing value handling, normalization, and outlier detection",
  schema: advancedDataPreprocessingSchema,
  execute: advancedPreprocessData
};