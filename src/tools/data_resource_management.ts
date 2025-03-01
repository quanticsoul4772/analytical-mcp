import { z } from "zod";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";
import * as fs from "fs/promises";
import * as path from "path";

// Data Resource Schema
export const dataResourceSchema = z.object({
  sourceType: z.enum([
    "file", 
    "local_path", 
    "inline_data"
  ]).describe("Type of data source"),
  
  fileFormat: z.enum([
    "csv", 
    "xlsx", 
    "json", 
    "jsonl"
  ]).describe("Format of the data"),
  
  source: z.string().describe("Path or data source"),
  
  // Optional transformation parameters
  transformations: z.object({
    // Column selection
    selectColumns: z.array(z.string()).optional(),
    
    // Filtering
    filterConditions: z.record(
      z.string(), 
      z.union([
        z.string(), 
        z.number(), 
        z.boolean(),
        z.array(z.any())
      ])
    ).optional(),
    
    // Aggregation
    aggregation: z.object({
      groupBy: z.array(z.string()).optional(),
      aggregate: z.record(
        z.string(), 
        z.enum(["sum", "avg", "min", "max", "count"])
      ).optional()
    }).optional()
  }).optional()
});

// Data parsing utility class
export class DataResourceManager {
  // Parse CSV file
  private async parseCSV(filePath: string): Promise<any[]> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const parseResult = Papa.parse(fileContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
      });

      if (parseResult.errors.length > 0) {
        throw new Error(`CSV Parsing Errors: ${JSON.stringify(parseResult.errors)}`);
      }

      return parseResult.data;
    } catch (error) {
      throw new Error(`Error parsing CSV: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Parse Excel file
  private async parseExcel(filePath: string): Promise<any[]> {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Take first sheet
      const worksheet = workbook.Sheets[sheetName];
      
      return XLSX.utils.sheet_to_json(worksheet, { raw: false });
    } catch (error) {
      throw new Error(`Error parsing Excel: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Parse JSON/JSONL file
  private async parseJSON(filePath: string): Promise<any[]> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      
      // Check if it's JSONL (line-delimited JSON)
      if (filePath.endsWith('.jsonl')) {
        return fileContent
          .trim()
          .split('\n')
          .map(line => JSON.parse(line));
      }
      
      // Regular JSON
      return JSON.parse(fileContent);
    } catch (error) {
      throw new Error(`Error parsing JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Apply transformations to data
  private applyTransformations(
    data: any[], 
    transformations?: z.infer<typeof dataResourceSchema>['transformations']
  ): any[] {
    if (!transformations) return data;

    let processedData = [...data];

    // Column selection
    if (transformations.selectColumns) {
      processedData = processedData.map(row => 
        Object.fromEntries(
          transformations.selectColumns!.map(col => [col, row[col]])
        )
      );
    }

    // Filtering
    if (transformations.filterConditions) {
      processedData = processedData.filter(row => 
        Object.entries(transformations.filterConditions!).every(([key, value]) => 
          row[key] === value
        )
      );
    }

    // Aggregation
    if (transformations.aggregation) {
      const { groupBy, aggregate } = transformations.aggregation;
      
      if (groupBy && aggregate) {
        const groupedData = processedData.reduce((acc, row) => {
          const groupKey = groupBy.map(col => row[col]).join('|');
          
          if (!acc[groupKey]) {
            acc[groupKey] = { ...row };
            Object.keys(aggregate).forEach(aggCol => {
              acc[groupKey][aggCol] = row[aggCol];
            });
          } else {
            Object.entries(aggregate).forEach(([aggCol, method]) => {
              switch (method) {
                case 'sum':
                  acc[groupKey][aggCol] += row[aggCol];
                  break;
                case 'avg':
                  // Simple avg implementation
                  acc[groupKey][aggCol] = 
                    (acc[groupKey][aggCol] + row[aggCol]) / 2;
                  break;
                case 'min':
                  acc[groupKey][aggCol] = Math.min(
                    acc[groupKey][aggCol], 
                    row[aggCol]
                  );
                  break;
                case 'max':
                  acc[groupKey][aggCol] = Math.max(
                    acc[groupKey][aggCol], 
                    row[aggCol]
                  );
                  break;
                case 'count':
                  acc[groupKey][aggCol] = 
                    (acc[groupKey][aggCol] || 0) + 1;
                  break;
              }
            });
          }
          
          return acc;
        }, {});

        processedData = Object.values(groupedData);
      }
    }

    return processedData;
  }

  // Main method to process data resources
  async processDataResource(
    sourceType: string, 
    fileFormat: string, 
    source: string,
    transformations?: z.infer<typeof dataResourceSchema>['transformations']
  ): Promise<string> {
    try {
      let data: any[];

      // Determine parsing method based on file format
      switch (fileFormat) {
        case 'csv':
          data = await this.parseCSV(source);
          break;
        case 'xlsx':
          data = await this.parseExcel(source);
          break;
        case 'json':
        case 'jsonl':
          data = await this.parseJSON(source);
          break;
        default:
          throw new Error(`Unsupported file format: ${fileFormat}`);
      }

      // Apply transformations
      const processedData = this.applyTransformations(data, transformations);

      // Generate markdown report
      return `# Data Resource Processing Report

## Source Details
- **Source Type**: ${sourceType}
- **File Format**: ${fileFormat}
- **Source Path**: ${source}

## Processing Results
- **Total Records**: ${processedData.length}
- **Columns**: ${Object.keys(processedData[0] || {}).join(', ')}

### Sample Data
\`\`\`json
${JSON.stringify(processedData.slice(0, 5), null, 2)}
\`\`\`

${transformations 
  ? `### Applied Transformations
  ${transformations.selectColumns 
    ? `- **Columns Selected**: ${transformations.selectColumns.join(', ')}` 
    : ''}
  ${transformations.filterConditions 
    ? `- **Filters Applied**: ${Object.entries(transformations.filterConditions).map(([k,v]) => `${k}: ${v}`).join(', ')}` 
    : ''}
  ${transformations.aggregation?.groupBy 
    ? `- **Grouped By**: ${transformations.aggregation.groupBy.join(', ')}` 
    : ''}
  ${transformations.aggregation?.aggregate 
    ? `- **Aggregations**: ${Object.entries(transformations.aggregation.aggregate).map(([k,v]) => `${k}: ${v}`).join(', ')}` 
    : ''}`
  : ''}`;
    } catch (error) {
      return `## Error Processing Data Resource
- **Error Message**: ${error instanceof Error ? error.message : String(error)}
- **Source Type**: ${sourceType}
- **File Format**: ${fileFormat}
- **Source Path**: ${source}`;
    }
  }
}

// Export for use in MCP server tools
export async function processDataResource(
  sourceType: string, 
  fileFormat: string, 
  source: string,
  transformations?: z.infer<typeof dataResourceSchema>['transformations']
): Promise<string> {
  const manager = new DataResourceManager();
  return await manager.processDataResource(
    sourceType, 
    fileFormat, 
    source, 
    transformations
  );
}

export const dataResourceManagementTool = {
  name: "data_resource_management",
  description: "Process and transform data from various sources and formats",
  schema: dataResourceSchema,
  execute: processDataResource
};