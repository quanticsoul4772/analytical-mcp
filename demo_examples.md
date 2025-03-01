# Analytical MCP Server - Demo Examples

This document provides sample workflows to demonstrate the capabilities of the Analytical MCP Server.

## Data Analysis Workflows

### Basic Dataset Summary

**Sample query:**
"Can you give me a summary of the sales2024 dataset?"

**Expected result:**
Claude will use the `analyze_dataset` tool with the default "summary" analysis type to provide a basic overview of the sales data, including the average, min, max, and sample data points.

### Detailed Statistical Analysis

**Sample query:**
"I need a detailed statistical analysis of the customerFeedback dataset. Can you show me all the metrics?"

**Expected result:**
Claude will use the `analyze_dataset` tool with the "stats" analysis type to provide comprehensive statistics including mean, median, standard deviation, quartiles, and other metrics for the customer feedback data.

### Comparing Multiple Datasets

**Sample query:**
"Can you compare the basic statistics between the productMetrics and operationalCosts datasets?"

**Expected result:**
Claude will use the `analyze_dataset` tool twice (once for each dataset) and then present a comparison between the two datasets, highlighting key differences and similarities.

## Decision Analysis Workflows

### Basic Decision Comparison

**Sample query:**
"I need to choose between 'Remote Work', 'Hybrid Model', and 'Office-based' work arrangements. The criteria are 'Productivity', 'Employee Satisfaction', and 'Cost Efficiency'. Which option should I choose?"

**Expected result:**
Claude will use the `decision_analysis` tool to evaluate the three work arrangements across the specified criteria, providing a ranked recommendation with pros and cons for each option.

### Weighted Decision Analysis

**Sample query:**
"I'm considering three vacation destinations: 'Beach Resort', 'Mountain Retreat', and 'City Tour'. My criteria are 'Cost' (weight 3), 'Activities' (weight 2), and 'Relaxation' (weight 5). Which destination would be best for me?"

**Expected result:**
Claude will use the `decision_analysis` tool with the specified weights to provide a personalized recommendation that prioritizes relaxation while still considering cost and available activities.

### Complex Decision Framework

**Sample query:**
"My team is evaluating four technology stacks for our new project: 'MERN', 'LAMP', 'JAMstack', and '.NET'. We need to consider 'Development Speed', 'Performance', 'Scalability', 'Learning Curve', 'Community Support', and 'Long-term Maintenance'. Can you help us make the best choice?"

**Expected result:**
Claude will use the `decision_analysis` tool to evaluate multiple options across numerous criteria, providing a comprehensive analysis with ranked recommendations, detailed pros and cons, and an explanation of the reasoning behind the recommendation.
