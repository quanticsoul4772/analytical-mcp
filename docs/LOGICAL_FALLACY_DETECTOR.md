# Logical Fallacy Detector

## Overview

The Logical Fallacy Detector is a specialized analytical tool that analyzes text to identify logical fallacies. It provides confidence-based detection, detailed explanations, and improvement suggestions to help enhance reasoning quality.

## Features

- **Multiple Fallacy Category Detection**: Identifies fallacies across various categories (informal, formal, relevance, ambiguity)
- **Configurable Confidence Thresholds**: Adjustable sensitivity for fallacy reporting
- **Detailed Explanations**: Provides descriptions and context for each detected fallacy
- **Improved Reasoning Examples**: Suggests better reasoning patterns to avoid identified fallacies
- **Overall Argument Assessment**: Evaluates the overall logical quality of the provided text

## Usage

### Basic Example

```javascript
const result = await logicalFallacyDetector({
  text: "Experts say this diet is the best, so it must work perfectly!",
  confidenceThreshold: 0.5,
  categories: ['relevance', 'informal'],
  includeExplanations: true,
  includeExamples: true
});
```

### Input Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `text` | string | Text to analyze for logical fallacies | (required) |
| `confidenceThreshold` | number | Minimum confidence level to report a fallacy (0.0-1.0) | 0.5 |
| `categories` | string[] | Fallacy categories to check ('informal', 'formal', 'relevance', 'ambiguity', 'all') | ['all'] |
| `includeExplanations` | boolean | Whether to include detailed explanations | true |
| `includeExamples` | boolean | Whether to include good and bad reasoning examples | true |

### Response Format

The function returns a markdown-formatted report with the following sections:

1. **Original Text**: Displays the analyzed text
2. **Detected Logical Fallacies**: Lists detected fallacies categorized by type
3. **Overall Assessment**: Provides a summary including fallacy count and severity rating

Example response:

```markdown
# Logical Fallacy Analysis

## Original Text:
> Experts say this diet is the best, so it must work perfectly!

## Detected Logical Fallacies

### Relevance Fallacies

#### Appeal to Authority (70% confidence)

**Description:** Claiming something is true because an authority figure says so

**Example of Fallacious Reasoning:**
> This diet must work because a celebrity doctor recommends it.

**Improved Reasoning:**
> Let's review peer-reviewed scientific studies and medical research about this diet's effectiveness.

## Overall Assessment

**Total Fallacies Detected:** 1

**Severity:** Low
```

## Detected Fallacy Types

The detector currently identifies the following fallacies:

### Relevance Fallacies

- **Ad Hominem**: Attacking the person making the argument rather than addressing the argument itself
- **Appeal to Authority**: Claiming something is true because an authority figure says so
- **Straw Man**: Misrepresenting an opponent's argument to make it easier to attack

### Informal Fallacies

- **False Dichotomy**: Presenting only two alternatives when more exist
- **Slippery Slope**: Arguing that a small first step will inevitably lead to a chain of related events

## Detection Mechanism

The fallacy detector works through pattern matching and confidence scoring:

1. **Pattern Identification**: Uses regular expressions to identify language patterns associated with common fallacies
2. **Confidence Scoring**: Assigns confidence scores based on the strength of the pattern match
3. **Threshold Filtering**: Reports only fallacies that meet or exceed the confidence threshold
4. **Categorization**: Groups detected fallacies by category for clearer reporting
5. **Report Generation**: Creates a formatted markdown report with findings

## Implementation Details

### Fallacy Definition Structure

Each fallacy is defined with the following structure:

```typescript
interface FallacyDefinition {
  name: string;         // Name of the fallacy
  category: string;     // Category (e.g., 'relevance', 'informal')
  description: string;  // Explanation of the fallacy
  signals: RegExp[];    // Pattern matchers for detection
  confidence: number;   // Base confidence level
  examples: {
    bad: string;        // Example of fallacious reasoning
    good: string;       // Example of improved reasoning
  };
}
```

### Performance Considerations

The implementation includes several performance optimizations:

1. **Early Validation**: Quickly validates input length before deeper processing
2. **Optimized Pattern Matching**: Exits early once a match is found
3. **Efficient Text Processing**: Pre-computes lowercase text once for case-insensitive matching
4. **Memory Efficiency**: Avoids unnecessary duplication of text data

### Error Handling

The detector implements robust error handling:

1. **Input Validation**: Validates all inputs using Zod schema
2. **Pattern Matching Errors**: Catches and logs any errors during RegExp processing
3. **Graceful Degradation**: Returns structured results even with partial processing success
4. **Detailed Error Reporting**: Provides context-rich error information for debugging

## Extending the Detector

### Adding New Fallacies

To add new fallacy types to the detector:

1. Add a new fallacy definition to the `getFallacyDefinitions` function:

```typescript
{
  name: "New Fallacy Name",
  category: "relevance",  // or appropriate category
  description: "Description of the new fallacy",
  signals: [
    /pattern1/i,
    /pattern2/i
  ],
  confidence: 0.6,  // base confidence (0.0-1.0)
  examples: {
    bad: "Example of the fallacy in use",
    good: "Example of better reasoning"
  }
}
```

2. Ensure the new category is added to the schema if it's a new category:

```typescript
categories: z.array(z.enum([
  'informal', 
  'formal', 
  'relevance', 
  'ambiguity',
  'new_category',  // Add new category here
  'all'
])).default(['all'])
```

### Improving Detection Accuracy

To enhance detection accuracy:

1. **Refine Existing Patterns**: Update RegExp patterns to better capture fallacy instances
2. **Adjust Confidence Levels**: Calibrate confidence scores based on detection reliability
3. **Add More Signals**: Increase the number of pattern matchers for each fallacy type
4. **Implement NLP Techniques**: For advanced implementations, integrate NLP methods for deeper semantic analysis

## Future Enhancements

Planned improvements for the fallacy detector include:

1. **Advanced NLP Integration**: Move beyond pattern matching to semantic understanding
2. **Machine Learning Classification**: Train models to detect subtle fallacies
3. **Context-Aware Analysis**: Consider the broader context of arguments
4. **Interactive Feedback**: Allow user feedback to improve detection accuracy
5. **Expanded Fallacy Database**: Support for more fallacy types and categories

## Dependencies

- **zod**: Schema validation for input parameters
- **Logger**: Custom logging utility for error and debug information

## Error Codes and Troubleshooting

| Error Type | Possible Cause | Solution |
|------------|----------------|----------|
| ValidationError | Invalid input parameters | Check parameter types and values against schema |
| DataProcessingError | Error during fallacy detection | Verify text content and patterns |
| ToolExecutionError | General execution failure | Check server logs for detailed information |

## Performance Benchmarks

With the current implementation:

- **Small texts** (<500 chars): <50ms processing time
- **Medium texts** (500-5000 chars): 50-200ms processing time
- **Large texts** (>5000 chars): 200-500ms processing time

These benchmarks may vary based on server resources and fallacy complexity.
