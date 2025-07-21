/**
 * Validation helpers for common patterns across the analytical MCP server
 * Reduces code duplication and improves maintainability through early returns
 */

export interface DataValidation {
  isValid: boolean;
  errorMessage?: string;
}

export class ValidationHelpers {
  /**
   * Validate that data is a non-empty array
   */
  static validateDataArray(data: any[]): DataValidation {
    if (!Array.isArray(data)) {
      return {
        isValid: false,
        errorMessage: 'Invalid data format. Please provide an array of data objects.'
      };
    }
    
    if (data.length === 0) {
      return {
        isValid: false,
        errorMessage: 'Data array is empty'
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate that specified variables exist in the data
   */
  static validateVariablesInData(variables: string[], data: Record<string, any>[]): DataValidation {
    if (!variables || variables.length === 0) {
      return {
        isValid: false,
        errorMessage: 'No variables specified'
      };
    }

    if (data.length === 0) {
      return { isValid: true }; // Skip validation if no data
    }

    const sampleDataPoint = data[0];
    if (!sampleDataPoint) {
      return { isValid: true }; // Skip validation if no sample data
    }

    for (const variable of variables) {
      if (!(variable in sampleDataPoint)) {
        return {
          isValid: false,
          errorMessage: `Variable '${variable}' not found in data. Available variables: ${Object.keys(sampleDataPoint).join(', ')}`
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate visualization type
   */
  static validateVisualizationType(type: string): DataValidation {
    const validTypes = ['scatter', 'line', 'bar', 'histogram', 'box', 'heatmap', 'pie', 'violin', 'correlation'];
    
    if (!validTypes.includes(type)) {
      return {
        isValid: false,
        errorMessage: `Invalid visualization type '${type}'. Valid types: ${validTypes.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate minimum variables required for visualization type
   */
  static validateVariableCount(type: string, variableCount: number): DataValidation {
    const requirements: Record<string, number> = {
      scatter: 2,
      line: 2,
      bar: 2,
      histogram: 1,
      box: 1,
      heatmap: 2,
      pie: 1,
      violin: 1,
      correlation: 2
    };

    const required = requirements[type] || 1;
    
    if (variableCount < required) {
      return {
        isValid: false,
        errorMessage: `${type} visualization requires at least ${required} variable(s), got ${variableCount}`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate that a string is non-empty
   */
  static validateNonEmptyString(value: string): DataValidation {
    if (typeof value !== 'string') {
      return {
        isValid: false,
        errorMessage: 'Value must be a string'
      };
    }
    
    if (value.trim().length === 0) {
      return {
        isValid: false,
        errorMessage: 'String cannot be empty'
      };
    }
    
    return { isValid: true };
  }

  /**
   * Apply early return validation pattern
   */
  static throwIfInvalid(validation: DataValidation): void {
    if (!validation.isValid) {
      throw new Error(validation.errorMessage || 'Validation failed');
    }
  }

  /**
   * Combine multiple validations with early return on first failure
   */
  static validateAll(...validations: DataValidation[]): DataValidation {
    for (const validation of validations) {
      if (!validation.isValid) {
        return validation;
      }
    }
    return { isValid: true };
  }

  /**
   * Safe string helper with default value
   */
  static ensureString(value: string | undefined, defaultValue: string = ''): string {
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Format field names for display (extracted from data_visualization_generator)
   */
  static formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1') // Insert a space before all caps
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/^\w/, (c) => c.toUpperCase()) // Capitalize the first letter
      .trim(); // Remove any extra spaces
  }

  /**
   * Detect categorical fields based on data patterns
   */
  static isLikelyCategorical(field: string, data: Record<string, any>[]): boolean {
    // Early return for empty data
    if (!data || data.length === 0) return false;

    // Early return for obvious categorical patterns
    const categoricalKeywords = [
      'category', 'group', 'type', 'status', 'level', 'gender', 
      'country', 'region', 'department', 'class', 'grade', 'rating', 
      'id', 'code', 'name', 'campaign'
    ];

    const hasKeyword = categoricalKeywords.some(keyword =>
      field.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasKeyword) return true;

    // Analyze actual data with early returns
    const uniqueValues = new Set();
    let stringCount = 0;
    let totalCount = 0;

    for (const item of data) {
      if (!(field in item)) continue;
      
      totalCount++;
      uniqueValues.add(item[field]);
      
      if (typeof item[field] === 'string') {
        stringCount++;
      }
    }

    // Early return for no data
    if (totalCount === 0) return false;

    // Early return if mostly strings
    if (stringCount / totalCount > 0.5) return true;

    // Early return if few unique values
    if (uniqueValues.size / totalCount < 0.2) return true;

    return false;
  }

  /**
   * Detect temporal fields based on data patterns
   */
  static isLikelyTemporal(field: string, data: Record<string, any>[]): boolean {
    // Early return for empty data
    if (!data || data.length === 0) return false;

    // Early return for obvious temporal patterns
    const temporalKeywords = [
      'date', 'time', 'year', 'month', 'day', 'hour', 
      'minute', 'second', 'quarter', 'week', 'timestamp'
    ];

    const hasKeyword = temporalKeywords.some(keyword =>
      field.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasKeyword) return true;

    // Analyze actual data with early returns
    let dateCount = 0;
    let totalCount = 0;

    for (const item of data) {
      if (!(field in item)) continue;
      
      totalCount++;
      const value = item[field];

      // Early identification of date types
      if (value instanceof Date) {
        dateCount++;
        continue;
      }

      if (typeof value === 'number' && value > 1000000000000) {
        dateCount++;
        continue;
      }

      if (typeof value === 'string') {
        const dateRegex = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4}/;
        if (dateRegex.test(value) || !isNaN(Date.parse(value))) {
          dateCount++;
        }
      }
    }

    // Early return for no data
    if (totalCount === 0) return false;

    // Return based on threshold
    return dateCount / totalCount > 0.5;
  }
}
