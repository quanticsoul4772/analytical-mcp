import Papa from 'papaparse';
import { z } from 'zod';

// Secure file parsing utility
export class SecureFileParser {
  // Parse CSV file with strict validation
  static async parseCSV<T extends z.ZodTypeAny>(
    file: File | string,
    schema: T,
    options: Papa.ParseConfig = {}
  ): Promise<z.infer<T>[]> {
    return new Promise((resolve, reject) => {
      const defaultOptions: Papa.ParseConfig = {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        transformHeader: (header) => header.trim().toLowerCase(),
      };

      const mergedOptions = { ...defaultOptions, ...options };

      Papa.parse(file, {
        ...mergedOptions,
        complete: (results: any) => {
          try {
            // Validate each row against the provided schema
            const validatedData = results.data.map((row: any) => {
              // Freeze the row to prevent prototype pollution
              const frozenRow = Object.freeze({ ...row });
              return schema.parse(frozenRow);
            });

            resolve(validatedData);
          } catch (validationError) {
            reject(
              new Error(
                `CSV Validation Error: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`
              )
            );
          }
        },
        error: (error: any) => {
          reject(new Error(`CSV Parsing Error: ${error.message}`));
        },
      });
    });
  }

  // Create a generic schema validator
  static createSchemaValidator<T extends z.ZodTypeAny>(schema: T): (data: unknown) => z.infer<T> {
    return (data: unknown) => {
      // Freeze input to prevent prototype pollution
      const frozenData = Object.freeze(data);
      return schema.parse(frozenData);
    };
  }

  // Sanitize input data
  static sanitizeInput(input: any): any {
    if (input === null || input === undefined) return input;

    if (Array.isArray(input)) {
      return input.map(this.sanitizeInput);
    }

    if (typeof input === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(input)) {
        // Remove any keys that might indicate prototype pollution
        if (!key.startsWith('__proto__') && !key.startsWith('constructor')) {
          sanitized[key] = this.sanitizeInput(value);
        }
      }
      return Object.freeze(sanitized);
    }

    return input;
  }
}

// Example usage schema
export const dataRowSchema = z
  .object({
    id: z.number(),
    value: z.number(),
    name: z.string().optional(),
  })
  .strict();
