/**
 * Tool Composition Framework
 * 
 * Enables chaining analytical tools together for complex workflows
 * with automatic error handling, rollback capabilities, and result passing.
 */

import { Logger } from './logger.js';
import { 
  AnalyticalError, 
  createDataProcessingError, 
  createValidationError,
  withErrorHandling 
} from './errors.js';
import { performanceMetrics } from './performance_metrics.js';

/**
 * Tool execution context for pipeline steps
 */
export interface ToolContext {
  sessionId: string;
  stepIndex: number;
  previousResults?: any[];
  metadata?: Record<string, any>;
  rollbackData?: any[];
}

/**
 * Tool step configuration
 */
export interface ToolStep<TInput = any, TOutput = any> {
  name: string;
  tool: (input: TInput, context?: ToolContext) => Promise<TOutput>;
  inputTransform?: (previousResult: any, context: ToolContext) => TInput;
  outputTransform?: (result: TOutput, context: ToolContext) => any;
  rollback?: (context: ToolContext) => Promise<void>;
  retryCount?: number;
  continueOnError?: boolean;
  description?: string;
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  name: string;
  description?: string;
  steps: ToolStep[];
  globalRollback?: boolean;
  parallel?: boolean;
  maxConcurrency?: number;
  timeout?: number;
}

/**
 * Pipeline execution result
 */
export interface PipelineResult {
  pipelineName: string;
  sessionId: string;
  success: boolean;
  results: any[];
  errors: Array<{ stepIndex: number; stepName: string; error: Error }>;
  executionTime: number;
  stepTimings: Array<{ stepName: string; executionTime: number }>;
  metadata?: Record<string, any>;
}

/**
 * Tool composition pipeline builder
 */
export class ToolPipeline {
  private config: PipelineConfig;
  private context: ToolContext;

  constructor(config: PipelineConfig) {
    this.config = config;
    this.context = {
      sessionId: this.generateSessionId(),
      stepIndex: 0,
      previousResults: [],
      rollbackData: []
    };
  }

  /**
   * Execute the pipeline
   */
  async execute(initialInput?: any): Promise<PipelineResult> {
    const startTime = Date.now();
    const sessionId = this.context.sessionId;
    
    Logger.info(`[pipeline] Starting pipeline execution: ${this.config.name}`, {
      sessionId,
      stepsCount: this.config.steps.length,
      parallel: this.config.parallel
    });

    const result: PipelineResult = {
      pipelineName: this.config.name,
      sessionId,
      success: false,
      results: [],
      errors: [],
      executionTime: 0,
      stepTimings: []
    };

    try {
      // Execute steps
      if (this.config.parallel) {
        await this.executeParallel(initialInput, result);
      } else {
        await this.executeSequential(initialInput, result);
      }

      result.success = result.errors.length === 0;
      result.executionTime = Date.now() - startTime;

      Logger.info(`[pipeline] Pipeline execution completed: ${this.config.name}`, {
        sessionId,
        success: result.success,
        executionTime: result.executionTime,
        errorCount: result.errors.length
      });

      // Record pipeline metrics
      performanceMetrics.recordMetrics(`pipeline_${this.config.name}`, {
        executionTime: result.executionTime,
        errorCount: result.errors.length,
        inputSize: JSON.stringify(initialInput).length,
        outputSize: JSON.stringify(result.results).length
      });

      return result;
    } catch (error) {
      result.success = false;
      result.executionTime = Date.now() - startTime;
      
      if (error instanceof Error) {
        result.errors.push({
          stepIndex: this.context.stepIndex,
          stepName: 'pipeline_execution',
          error
        });
      }

      // Attempt rollback if enabled
      if (this.config.globalRollback) {
        await this.performGlobalRollback();
      }

      Logger.error(`[pipeline] Pipeline execution failed: ${this.config.name}`, {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: result.executionTime
      });

      return result;
    }
  }

  /**
   * Execute steps sequentially
   */
  private async executeSequential(initialInput: any, result: PipelineResult): Promise<void> {
    let currentInput = initialInput;

    for (let i = 0; i < this.config.steps.length; i++) {
      const step = this.config.steps[i];
      this.context.stepIndex = i;

      try {
        const stepStartTime = Date.now();
        const stepResult = await this.executeStep(step, currentInput);
        const stepExecutionTime = Date.now() - stepStartTime;

        result.results.push(stepResult);
        result.stepTimings.push({
          stepName: step.name,
          executionTime: stepExecutionTime
        });

        // Prepare input for next step
        if (i < this.config.steps.length - 1) {
          currentInput = stepResult;
        }

        this.context.previousResults!.push(stepResult);

      } catch (error) {
        const stepError = error instanceof Error ? error : new Error(String(error));
        
        result.errors.push({
          stepIndex: i,
          stepName: step.name,
          error: stepError
        });

        if (!step.continueOnError) {
          throw createDataProcessingError(
            `Pipeline step '${step.name}' failed`,
            { stepIndex: i, error: stepError },
            `pipeline_${this.config.name}`
          );
        }

        Logger.warn(`[pipeline] Step failed but continuing: ${step.name}`, {
          sessionId: this.context.sessionId,
          stepIndex: i,
          error: stepError.message
        });
      }
    }
  }

  /**
   * Execute steps in parallel
   */
  private async executeParallel(initialInput: any, result: PipelineResult): Promise<void> {
    const maxConcurrency = this.config.maxConcurrency || this.config.steps.length;
    const chunks = this.chunkArray(this.config.steps, maxConcurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async (step, index) => {
        const stepStartTime = Date.now();
        this.context.stepIndex = this.config.steps.indexOf(step);

        try {
          const stepResult = await this.executeStep(step, initialInput);
          const stepExecutionTime = Date.now() - stepStartTime;

          return {
            success: true,
            result: stepResult,
            stepName: step.name,
            executionTime: stepExecutionTime,
            stepIndex: this.context.stepIndex
          };
        } catch (error) {
          const stepExecutionTime = Date.now() - stepStartTime;
          
          return {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            stepName: step.name,
            executionTime: stepExecutionTime,
            stepIndex: this.context.stepIndex
          };
        }
      });

      const chunkResults = await Promise.all(promises);

      // Process chunk results
      for (const chunkResult of chunkResults) {
        result.stepTimings.push({
          stepName: chunkResult.stepName,
          executionTime: chunkResult.executionTime
        });

        if (chunkResult.success) {
          result.results.push(chunkResult.result);
        } else {
          result.errors.push({
            stepIndex: chunkResult.stepIndex,
            stepName: chunkResult.stepName,
            error: chunkResult.error!
          });
        }
      }
    }
  }

  /**
   * Execute a single step with error handling and rollback support
   */
  private async executeStep(step: ToolStep, input: any): Promise<any> {
    Logger.debug(`[pipeline] Executing step: ${step.name}`, {
      sessionId: this.context.sessionId,
      stepIndex: this.context.stepIndex
    });

    // Transform input if transformer provided
    let transformedInput = input;
    if (step.inputTransform) {
      transformedInput = step.inputTransform(input, this.context);
    }

    // Store rollback data before execution
    if (step.rollback) {
      this.context.rollbackData!.push({
        stepIndex: this.context.stepIndex,
        stepName: step.name,
        rollbackFn: step.rollback
      });
    }

    // Execute the tool with retry logic
    const retries = step.retryCount || 1;
    let lastError: Error;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const result = await step.tool(transformedInput, this.context);
        
        // Transform output if transformer provided
        if (step.outputTransform) {
          return step.outputTransform(result, this.context);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < retries - 1) {
          Logger.warn(`[pipeline] Step retry: ${step.name}`, {
            sessionId: this.context.sessionId,
            attempt: attempt + 1,
            error: lastError.message
          });
          
          // Exponential backoff for retries
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Perform global rollback for all executed steps
   */
  private async performGlobalRollback(): Promise<void> {
    Logger.info(`[pipeline] Performing global rollback: ${this.config.name}`, {
      sessionId: this.context.sessionId
    });

    const rollbackData = this.context.rollbackData || [];
    
    // Execute rollback in reverse order
    for (let i = rollbackData.length - 1; i >= 0; i--) {
      const rollbackInfo = rollbackData[i];
      
      try {
        await rollbackInfo.rollbackFn(this.context);
        Logger.debug(`[pipeline] Rollback completed for step: ${rollbackInfo.stepName}`);
      } catch (rollbackError) {
        Logger.error(`[pipeline] Rollback failed for step: ${rollbackInfo.stepName}`, {
          error: rollbackError instanceof Error ? rollbackError.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Utility methods
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Pipeline Builder for fluent API
 */
export class PipelineBuilder {
  private config: Partial<PipelineConfig> = { steps: [] };

  /**
   * Set pipeline name and description
   */
  name(name: string, description?: string): PipelineBuilder {
    this.config.name = name;
    this.config.description = description;
    return this;
  }

  /**
   * Add a step to the pipeline
   */
  step<TInput, TOutput>(
    name: string,
    tool: (input: TInput, context?: ToolContext) => Promise<TOutput>,
    options?: Partial<Omit<ToolStep<TInput, TOutput>, 'name' | 'tool'>>
  ): PipelineBuilder {
    this.config.steps!.push({
      name,
      tool,
      ...options
    });
    return this;
  }

  /**
   * Enable parallel execution
   */
  parallel(maxConcurrency?: number): PipelineBuilder {
    this.config.parallel = true;
    this.config.maxConcurrency = maxConcurrency;
    return this;
  }

  /**
   * Enable global rollback
   */
  withRollback(): PipelineBuilder {
    this.config.globalRollback = true;
    return this;
  }

  /**
   * Set pipeline timeout
   */
  timeout(ms: number): PipelineBuilder {
    this.config.timeout = ms;
    return this;
  }

  /**
   * Build the pipeline
   */
  build(): ToolPipeline {
    if (!this.config.name) {
      throw createValidationError('Pipeline name is required');
    }
    
    if (!this.config.steps || this.config.steps.length === 0) {
      throw createValidationError('Pipeline must have at least one step');
    }

    return new ToolPipeline(this.config as PipelineConfig);
  }
}

/**
 * Create a new pipeline builder
 */
export function createPipeline(): PipelineBuilder {
  return new PipelineBuilder();
}

/**
 * Pre-configured pipeline examples
 */
export const PipelineTemplates = {
  /**
   * Data Analysis Pipeline: analyze → visualize → report
   */
  dataAnalysis: (analyzeDataset: any, visualizeData: any, generateReport: any) =>
    createPipeline()
      .name('data_analysis', 'Complete data analysis workflow')
      .step('analyze', analyzeDataset, {
        description: 'Analyze the input dataset',
        retryCount: 2
      })
      .step('visualize', visualizeData, {
        description: 'Generate visualizations from analysis',
        inputTransform: (analysisResult) => analysisResult.data,
        continueOnError: true
      })
      .step('report', generateReport, {
        description: 'Generate final report',
        inputTransform: (vizResult, context) => ({
          analysis: context.previousResults![0],
          visualizations: vizResult
        })
      })
      .withRollback()
      .build(),

  /**
   * Research Pipeline: search → verify → analyze
   */
  research: (exaResearch: any, researchVerification: any, analyzeFindings: any) =>
    createPipeline()
      .name('research_pipeline', 'Complete research and verification workflow')
      .step('search', exaResearch, {
        description: 'Search for research information',
        retryCount: 3
      })
      .step('verify', researchVerification, {
        description: 'Cross-verify research findings',
        inputTransform: (searchResults) => ({
          query: searchResults.query,
          sources: searchResults.results
        })
      })
      .step('analyze', analyzeFindings, {
        description: 'Analyze verified research findings',
        inputTransform: (verificationResult, context) => ({
          originalQuery: context.previousResults![0].query,
          verifiedResults: verificationResult.verifiedResults,
          confidence: verificationResult.confidence
        })
      })
      .build()
};

/**
 * Export the main pipeline creation function
 */
export { createPipeline as pipeline };