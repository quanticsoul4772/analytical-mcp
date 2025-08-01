import { z } from 'zod';
import { SecureFileParser } from '../utils/secure_file_parser.js';
import Papa from 'papaparse';
import { Logger } from '../utils/logger.js';
import { 
  withErrorHandling, 
  createValidationError, 
  createDataProcessingError,
  createAPIError,
  ErrorCodes,
  ValidationError, 
  DataProcessingError 
} from '../utils/errors.js';

// Schema for data resource management
export const dataResourceManagementSchema = z.object({
  resourceType: z.enum(['csv', 'json', 'text']),
  filePath: z.string(),
  options: z.record(z.any()).optional(),
});

// Data resource management tool (internal implementation)
async function dataResourceManagementInternal(
  resourceType: string,
  filePath: string,
  options?: Record<string, any>
): Promise<string> {
  // Validate inputs
  try {
    dataResourceManagementSchema.parse({
      resourceType,
      filePath,
      options,
    });
    Logger.debug(`Validated resource management request`, { resourceType, filePath });
  } catch (error) {
    if (error instanceof z.ZodError) {
      Logger.error('Resource management validation failed', error);
      throw createValidationError(
        `Invalid parameters for resource management: ${error.message}`,
        { issues: error.issues, resourceType, filePath },
        'data_resource_management'
      );
    }
    throw error;
  }
  try {
    switch (resourceType) {
      case 'csv':
        const csvSchema = z.array(z.record(z.string(), z.any())).optional();
        const csvData = await SecureFileParser.parseCSV(filePath, csvSchema, options);
        return JSON.stringify({
          totalRows: csvData.length,
          headers: Object.keys(csvData[0] || {}),
          preview: csvData.slice(0, 5),
        });

      case 'json':
        const rawContent = await import(filePath);
        return JSON.stringify({
          type: typeof rawContent,
          size: Object.keys(rawContent).length,
          preview: JSON.stringify(rawContent).slice(0, 500),
        });

      case 'text':
        const textContent = await import(filePath);
        return JSON.stringify({
          length: textContent.length,
          preview: textContent.slice(0, 200),
        });

      default:
        throw createValidationError(
          `Unsupported resource type: ${resourceType}`,
          { resourceType, supportedTypes: ['csv', 'json', 'text'] },
          'data_resource_management'
        );
    }
  } catch (error) {
    Logger.error('Data Resource Management Error', error, {
      resourceType,
      filePath,
    });
    
    // Re-throw standardized errors
    if (error instanceof Error && (error.name.includes('ValidationError') || error.name.includes('DataProcessingError'))) {
      throw error;
    }
    
    throw createDataProcessingError(
      `Failed to manage resource: ${error instanceof Error ? error.message : String(error)}`,
      { resourceType, filePath, error: error instanceof Error ? error.message : String(error) },
      'data_resource_management'
    );
  }
}

// Export wrapped function
export const dataResourceManagement = withErrorHandling('data_resource_management', dataResourceManagementInternal);
