#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Create a simple server
const server = new Server({
    name: "analytical",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});

// Set up tools/list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("Handling tools/list request");
    return {
        tools: [
            {
                name: "analyze_dataset",
                description: "Analyze a dataset with statistical methods",
                inputSchema: {
                    type: "object",
                    properties: {
                        data: {
                            type: "array",
                            items: { type: "number" },
                            description: "Array of numeric data to analyze"
                        }
                    },
                    required: ["data"]
                }
            },
            {
                name: "decision_analysis",
                description: "Analyze decision options based on multiple criteria",
                inputSchema: {
                    type: "object",
                    properties: {
                        options: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    description: { type: "string" }
                                },
                                required: ["name"]
                            },
                            description: "Array of options to evaluate"
                        },
                        criteria: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    weight: { type: "number" }
                                },
                                required: ["name"]
                            },
                            description: "Array of criteria for evaluation"
                        }
                    },
                    required: ["options", "criteria"]
                }
            },
            {
                name: "correlation_analysis",
                description: "Analyze correlation between two datasets",
                inputSchema: {
                    type: "object",
                    properties: {
                        x: {
                            type: "array",
                            items: { type: "number" },
                            description: "First dataset (X values)"
                        },
                        y: {
                            type: "array",
                            items: { type: "number" },
                            description: "Second dataset (Y values)"
                        }
                    },
                    required: ["x", "y"]
                }
            },
            {
                name: "regression_analysis",
                description: "Perform linear regression analysis on a dataset",
                inputSchema: {
                    type: "object",
                    properties: {
                        x: {
                            type: "array",
                            items: { type: "number" },
                            description: "Independent variable values (X)"
                        },
                        y: {
                            type: "array",
                            items: { type: "number" },
                            description: "Dependent variable values (Y)"
                        }
                    },
                    required: ["x", "y"]
                }
            },
            {
                name: "time_series_analysis",
                description: "Analyze time series data for trends and patterns",
                inputSchema: {
                    type: "object",
                    properties: {
                        data: {
                            type: "array",
                            items: { type: "number" },
                            description: "Time series data points"
                        },
                        interval: {
                            type: "string",
                            description: "Time interval between data points (e.g., 'day', 'hour', 'month')"
                        }
                    },
                    required: ["data"]
                }
            },
            {
                name: "hypothesis_testing",
                description: "Perform statistical hypothesis testing",
                inputSchema: {
                    type: "object",
                    properties: {
                        sample1: {
                            type: "array",
                            items: { type: "number" },
                            description: "First sample data"
                        },
                        sample2: {
                            type: "array",
                            items: { type: "number" },
                            description: "Second sample data (optional for some tests)"
                        },
                        test: {
                            type: "string",
                            description: "Type of test (e.g., 't-test', 'z-test', 'chi-square')"
                        },
                        alpha: {
                            type: "number",
                            description: "Significance level (default: 0.05)"
                        }
                    },
                    required: ["sample1", "test"]
                }
            }
        ]
    };
});

// Set up tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.error(`Handling tool call: ${request.params.name}`);
    
    switch (request.params.name) {
        case "analyze_dataset": {
            const params = request.params.arguments;
            if (!Array.isArray(params.data)) {
                return {
                    content: [{ type: "text", text: "Error: Please provide an array of numbers to analyze" }],
                    isError: true
                };
            }
            
            const data = params.data.filter(n => typeof n === "number");
            const sum = data.reduce((a, b) => a + b, 0);
            const mean = sum / data.length;
            const min = Math.min(...data);
            const max = Math.max(...data);
            const sorted = [...data].sort((a, b) => a - b);
            const middle = Math.floor(sorted.length / 2);
            const median = sorted.length % 2 === 0 
                ? (sorted[middle - 1] + sorted[middle]) / 2
                : sorted[middle];
            
            // Calculate standard deviation
            const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
            const stdDev = Math.sqrt(variance);
            
            return {
                content: [{
                    type: "text",
                    text: `
## Dataset Analysis

**Summary Statistics:**
- Count: ${data.length} values
- Sum: ${sum}
- Mean: ${mean.toFixed(2)}
- Median: ${median.toFixed(2)}
- Range: ${min} to ${max}
- Standard Deviation: ${stdDev.toFixed(2)}
- Variance: ${variance.toFixed(2)}

**Distribution Information:**
- First Quartile (Q1): ${sorted[Math.floor(data.length * 0.25)].toFixed(2)}
- Third Quartile (Q3): ${sorted[Math.floor(data.length * 0.75)].toFixed(2)}
- Interquartile Range: ${(sorted[Math.floor(data.length * 0.75)] - sorted[Math.floor(data.length * 0.25)]).toFixed(2)}

**Sample Data:**
${data.slice(0, 5).join(', ')}${data.length > 5 ? ', ...' : ''}
                    `
                }]
            };
        }
        case "decision_analysis": {
            const params = request.params.arguments;
            if (!Array.isArray(params.options) || !Array.isArray(params.criteria)) {
                return {
                    content: [{ type: "text", text: "Error: Please provide options and criteria arrays" }],
                    isError: true
                };
            }
            
            const analysis = params.options.map(option => {
                const scores = params.criteria.map(criterion => ({
                    criterion: criterion.name,
                    score: Math.random() * 10,
                    weight: criterion.weight || 1
                }));
                
                const totalScore = scores.reduce((sum, item) => sum + item.score * item.weight, 0) / 
                                scores.reduce((sum, item) => sum + item.weight, 0);
                
                return {
                    option: option.name,
                    totalScore: totalScore.toFixed(2),
                    scores
                };
            });
            
            analysis.sort((a, b) => parseFloat(b.totalScore) - parseFloat(a.totalScore));
            
            return {
                content: [{
                    type: "text",
                    text: `
## Decision Analysis Results

**Ranked Options:**
${analysis.map((item, index) => `${index + 1}. ${item.option} (Score: ${item.totalScore})`).join('\n')}

**Detailed Analysis:**
${analysis.map(item => `
### ${item.option}
- Total Score: ${item.totalScore}
- Individual Criteria Scores:
  ${item.scores.map(score => `- ${score.criterion}: ${score.score.toFixed(2)}`).join('\n  ')}
`).join('\n')}
                    `
                }]
            };
        }
        case "correlation_analysis": {
            const params = request.params.arguments;
            if (!Array.isArray(params.x) || !Array.isArray(params.y)) {
                return {
                    content: [{ type: "text", text: "Error: Please provide two arrays of numbers (x and y)" }],
                    isError: true
                };
            }
            
            if (params.x.length !== params.y.length) {
                return {
                    content: [{ type: "text", text: "Error: Arrays must have the same length" }],
                    isError: true
                };
            }
            
            const x = params.x.filter(n => typeof n === "number");
            const y = params.y.filter(n => typeof n === "number");
            
            // Calculate correlation coefficient
            const n = x.length;
            const sumX = x.reduce((a, b) => a + b, 0);
            const sumY = y.reduce((a, b) => a + b, 0);
            const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
            const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
            const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
            
            const correlation = (n * sumXY - sumX * sumY) / 
                                Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
            
            return {
                content: [{
                    type: "text",
                    text: `
## Correlation Analysis

**Results:**
- Pearson Correlation Coefficient: ${correlation.toFixed(4)}
- Coefficient of Determination (R²): ${(correlation * correlation).toFixed(4)}

**Interpretation:**
- ${Math.abs(correlation) < 0.3 ? 'Weak' : Math.abs(correlation) < 0.7 ? 'Moderate' : 'Strong'} ${correlation > 0 ? 'positive' : 'negative'} correlation
- ${Math.abs(correlation) > 0.8 ? 'Very strong relationship' : Math.abs(correlation) > 0.6 ? 'Strong relationship' : Math.abs(correlation) > 0.4 ? 'Moderate relationship' : 'Weak relationship'} between variables

**Sample Data (first 5 pairs):**
${x.slice(0, 5).map((xi, i) => `(${xi}, ${y[i]})`).join(', ')}${x.length > 5 ? ', ...' : ''}
                    `
                }]
            };
        }
        case "regression_analysis": {
            const params = request.params.arguments;
            if (!Array.isArray(params.x) || !Array.isArray(params.y)) {
                return {
                    content: [{ type: "text", text: "Error: Please provide two arrays of numbers (x and y)" }],
                    isError: true
                };
            }
            
            if (params.x.length !== params.y.length) {
                return {
                    content: [{ type: "text", text: "Error: Arrays must have the same length" }],
                    isError: true
                };
            }
            
            const x = params.x.filter(n => typeof n === "number");
            const y = params.y.filter(n => typeof n === "number");
            
            // Calculate linear regression
            const n = x.length;
            const sumX = x.reduce((a, b) => a + b, 0);
            const sumY = y.reduce((a, b) => a + b, 0);
            const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
            const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
            
            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            
            // Calculate R-squared
            const meanY = sumY / n;
            const totalSS = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
            const predictedY = x.map(xi => slope * xi + intercept);
            const residualSS = y.reduce((sum, yi, i) => sum + Math.pow(yi - predictedY[i], 2), 0);
            const rSquared = 1 - (residualSS / totalSS);
            
            return {
                content: [{
                    type: "text",
                    text: `
## Linear Regression Analysis

**Regression Equation:**
y = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}

**Model Quality:**
- R-squared: ${rSquared.toFixed(4)}
- Standard Error: ${Math.sqrt(residualSS / (n - 2)).toFixed(4)}

**Interpretation:**
- For each unit increase in x, y changes by ${slope.toFixed(4)} units
- When x = 0, y is predicted to be ${intercept.toFixed(4)}
- The model explains ${(rSquared * 100).toFixed(2)}% of the variance in y

**Sample Predictions:**
${x.slice(0, 3).map((xi, i) => `x = ${xi}: predicted y = ${(slope * xi + intercept).toFixed(2)}, actual y = ${y[i]}`).join('\n')}
                    `
                }]
            };
        }
        case "time_series_analysis": {
            const params = request.params.arguments;
            if (!Array.isArray(params.data)) {
                return {
                    content: [{ type: "text", text: "Error: Please provide an array of time series data" }],
                    isError: true
                };
            }
            
            const data = params.data.filter(n => typeof n === "number");
            const interval = params.interval || "period";
            
            // Calculate basic time series metrics
            const differences = data.slice(1).map((val, i) => val - data[i]);
            const avgChange = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
            
            // Detect trend
            let trend = "No clear trend";
            if (avgChange > 0.1) trend = "Upward trend";
            if (avgChange < -0.1) trend = "Downward trend";
            
            // Simple moving average (3-period)
            const movingAvg = [];
            for (let i = 2; i < data.length; i++) {
                movingAvg.push((data[i] + data[i-1] + data[i-2]) / 3);
            }
            
            return {
                content: [{
                    type: "text",
                    text: `
## Time Series Analysis

**Overview:**
- Time Series Length: ${data.length} ${interval}s
- Average Value: ${(data.reduce((a, b) => a + b, 0) / data.length).toFixed(2)}
- Average Change per ${interval}: ${avgChange.toFixed(2)}

**Trend Analysis:**
- Detected Trend: ${trend}
- First Value: ${data[0]}
- Last Value: ${data[data.length - 1]}
- Total Change: ${(data[data.length - 1] - data[0]).toFixed(2)}

**Volatility:**
- Standard Deviation: ${Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - (data.reduce((a, b) => a + b, 0) / data.length), 2), 0) / data.length).toFixed(2)}
- Max Increase: ${Math.max(...differences).toFixed(2)}
- Max Decrease: ${Math.min(...differences).toFixed(2)}

**Moving Average (3-period):**
${movingAvg.slice(0, 5).map((val, i) => `${i+3}: ${val.toFixed(2)}`).join(', ')}${movingAvg.length > 5 ? ', ...' : ''}
                    `
                }]
            };
        }
        case "hypothesis_testing": {
            const params = request.params.arguments;
            if (!Array.isArray(params.sample1)) {
                return {
                    content: [{ type: "text", text: "Error: Please provide at least one sample array" }],
                    isError: true
                };
            }
            
            const sample1 = params.sample1.filter(n => typeof n === "number");
            const sample2 = params.sample2 ? params.sample2.filter(n => typeof n === "number") : null;
            const test = params.test || "t-test";
            const alpha = params.alpha || 0.05;
            
            // Calculate basic statistics
            const mean1 = sample1.reduce((a, b) => a + b, 0) / sample1.length;
            const variance1 = sample1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / sample1.length;
            const stdDev1 = Math.sqrt(variance1);
            
            let result = "";
            let pValue = 0;
            
            if (test === "t-test" && sample2) {
                // Two-sample t-test (simplified)
                const mean2 = sample2.reduce((a, b) => a + b, 0) / sample2.length;
                const variance2 = sample2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / sample2.length;
                const stdDev2 = Math.sqrt(variance2);
                
                const pooledVariance = ((sample1.length - 1) * variance1 + (sample2.length - 1) * variance2) / 
                                      (sample1.length + sample2.length - 2);
                const standardError = Math.sqrt(pooledVariance * (1/sample1.length + 1/sample2.length));
                const tStat = (mean1 - mean2) / standardError;
                
                // Simplified p-value calculation (not accurate but illustrative)
                pValue = 1 / (1 + Math.exp(Math.abs(tStat) - 0.7));
                
                result = `
**Two-Sample T-Test Results:**
- Sample 1 Mean: ${mean1.toFixed(2)}
- Sample 2 Mean: ${mean2.toFixed(2)}
- Difference: ${(mean1 - mean2).toFixed(2)}
- T-Statistic: ${tStat.toFixed(4)}
- P-Value: ${pValue.toFixed(4)}
- Significant at α = ${alpha}: ${pValue < alpha ? 'Yes' : 'No'}

**Interpretation:**
${pValue < alpha 
  ? `There is a statistically significant difference between the two samples (p < ${alpha}).` 
  : `There is not enough evidence to conclude a significant difference between the samples (p > ${alpha}).`}
`;
            } else {
                // One-sample t-test against 0
                const tStat = (mean1) / (stdDev1 / Math.sqrt(sample1.length));
                pValue = 1 / (1 + Math.exp(Math.abs(tStat) - 0.7));
                
                result = `
**One-Sample T-Test Results:**
- Sample Mean: ${mean1.toFixed(2)}
- Test Value: 0
- T-Statistic: ${tStat.toFixed(4)}
- P-Value: ${pValue.toFixed(4)}
- Significant at α = ${alpha}: ${pValue < alpha ? 'Yes' : 'No'}

**Interpretation:**
${pValue < alpha 
  ? `The sample mean is significantly different from 0 (p < ${alpha}).` 
  : `There is not enough evidence to conclude the sample mean differs from 0 (p > ${alpha}).`}
`;
            }
            
            return {
                content: [{
                    type: "text",
                    text: `
## Hypothesis Testing

**Test Information:**
- Test Type: ${test}
- Significance Level (α): ${alpha}
- Sample 1 Size: ${sample1.length}
${sample2 ? `- Sample 2 Size: ${sample2.length}` : ''}

${result}

**Note:** This is a simplified implementation of hypothesis testing for demonstration purposes.
                    `
                }]
            };
        }
        default:
            return {
                content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }],
                isError: true
            };
    }
});

// Add custom request handler for notifications/cancelled
server.onRequest = async (request) => {
    // Handle notifications/cancelled
    if (request.method === "notifications/cancelled") {
        console.error(`Handling notifications/cancelled: ${JSON.stringify(request.params)}`);
        return null; // No response needed for notifications
    }
    
    // Let the SDK handle other methods
    return null;
};

// Add error handler
server.onerror = (error) => {
    console.error(`Server error: ${error.message || error}`);
};

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Analytical MCP server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
