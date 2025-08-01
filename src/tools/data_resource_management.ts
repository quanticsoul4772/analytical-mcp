import { z } from 'zod';
import { SecureFileParser } from '../utils/secure_file_parser.js';
import Papa from 'papaparse';
import { Logger } from '../utils/logger.js';
import { 
  ValidationError, 
  DataProcessingError,
  AnalyticalError,
  withErrorHandling,
  createValidationError,
  createDataProcessingError 
} from '../utils/errors.js';

// Schema for data resource management
export const dataResourceManagementSchema = z.object({
  resourceType: z.enum(['csv', 'json', 'text']),
  filePath: z.string(),
  options: z.record(z.any()).optional(),
});

// Internal data resource management function
async function dataResourceManagementInternal(
  input: z.infer<typeof dataResourceManagementSchema>
): Promise<string> {
  const { resourceType, filePath, options } = dataResourceManagementSchema.parse(input);
  
  Logger.info(`[data_resource_management] Processing ${resourceType} resource: ${filePath}`);

  // Validate file path exists and is accessible
  if (!filePath || typeof filePath !== 'string') {
    throw createValidationError(
      'File path is required and must be a string',
      { filePath },
      'data_resource_management'
    );
  }

  try {
    switch (resourceType) {
      case 'csv': {
        const csvSchema = z.array(z.record(z.string(), z.any())).optional();
        const csvData = await SecureFileParser.parseCSV(filePath, csvSchema, options);
        
        if (!Array.isArray(csvData)) {
          throw createDataProcessingError(
            'CSV parsing did not return an array',
            { filePath, dataType: typeof csvData },
            'data_resource_management'
          );
        }

        const result = {
          resourceType: 'csv',
          totalRows: csvData.length,
          headers: Object.keys(csvData[0] || {}),
          preview: csvData.slice(0, 5),
          processingTimestamp: new Date().toISOString()
        };

        Logger.info(`[data_resource_management] CSV processed successfully`, {
          rows: result.totalRows,
          headers: result.headers.length
        });

        return JSON.stringify(result);
      }

      case 'json': {
        try {
          const rawContent = await import(filePath);
          const result = {
            resourceType: 'json',
            type: typeof rawContent,
            size: Object.keys(rawContent).length,
            preview: JSON.stringify(rawContent).slice(0, 500),
            processingTimestamp: new Date().toISOString()
          };

          Logger.info(`[data_resource_management] JSON processed successfully`, {
            type: result.type,
            size: result.size
          });

          return JSON.stringify(result);
        } catch (importError) {
          throw createDataProcessingError(
            `Failed to import JSON file: ${importError instanceof Error ? importError.message : 'Unknown error'}`,
            { filePath, error: importError },
            'data_resource_management'
          );
        }
      }

      case 'text': {
        try {
          const textContent = await import(filePath);
          
          if (typeof textContent !== 'string') {
            throw createDataProcessingError(
              'Text file did not return string content',
              { filePath, contentType: typeof textContent },
              'data_resource_management'
            );
          }

          const result = {
            resourceType: 'text',
            length: textContent.length,
            preview: textContent.slice(0, 200),
            processingTimestamp: new Date().toISOString()
          };

          Logger.info(`[data_resource_management] Text processed successfully`, {
            length: result.length
          });

          return JSON.stringify(result);
        } catch (importError) {
          throw createDataProcessingError(
            `Failed to import text file: ${importError instanceof Error ? importError.message : 'Unknown error'}`,
            { filePath, error: importError },
            'data_resource_management'
          );
        }
      }

      default:
        throw createValidationError(
          `Unsupported resource type: ${resourceType}`,
          { resourceType, supportedTypes: ['csv', 'json', 'text'] },
          'data_resource_management'
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(
        'Invalid data resource management input',
        { issues: error.issues },
        'data_resource_management'
      );
    }

    if (error instanceof AnalyticalError) {
      throw error;
    }

    throw createDataProcessingError(
      `Resource management failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { resourceType, filePath, error },
      'data_resource_management'
    );
  }
}

// Export the main function with error handling wrapper
export const dataResourceManagement = withErrorHandling('data_resource_management', dataResourceManagementInternal);
