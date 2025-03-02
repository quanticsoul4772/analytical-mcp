/**
 * Data-Driven ML Evaluation
 * 
 * This example demonstrates integrating ML model evaluation with 
 * research-enhanced analysis to provide context-aware model assessment.
 * 
 * Use case: Evaluating a machine learning model against industry benchmarks
 */

import dotenv from 'dotenv';
import { exaResearch } from '../build/utils/exa_research.js';
import { researchIntegration } from '../build/utils/research_integration.js';
import { analyzeDataset } from '../build/tools/analyze_dataset.js';
import { advancedRegressionAnalysis } from '../build/tools/advanced_regression_analysis.js';
import { rateLimitManager } from '../build/utils/rate_limit_manager.js';

// Load environment variables
dotenv.config();

// Initialize rate limit management
if (process.env.EXA_API_KEY) {
  rateLimitManager.registerApiKeys('exa', [process.env.EXA_API_KEY]);
  rateLimitManager.configureEndpoint('exa/search', 10, 60 * 1000);
  rateLimitManager.configureEndpoint('exa/research-enrichment', 8, 60 * 1000);
}

/**
 * Run a data-driven ML evaluation
 */
async function dataDrivernMLEvaluation() {
  console.log("=== DATA-DRIVEN ML EVALUATION ===\n");

  try {
    // Step 1: Define model evaluation scenario
    console.log("🔍 Step 1: Defining model evaluation scenario");
    
    // Simulated model performance metrics
    const modelMetrics = {
      modelName: "CustomerChurnPredictor-XGBoost",
      domain: "Customer Churn Prediction",
      accuracy: 0.82,
      precision: 0.79,
      recall: 0.71,
      f1Score: 0.75,
      auc: 0.86,
      trainingTime: "4.2 hours",
      inferenceLatency: "150ms",
      modelSize: "450MB",
      features: [
        "subscription_length_months",
        "monthly_charges",
        "total_charges", 
        "contract_type",
        "payment_method",
        "customer_service_calls",
        "age",
        "gender",
        "has_dependents"
      ],
      targetVariable: "churn_in_next_30_days"
    };
    
    console.log("Model Information:");
    console.log(`  Name: ${modelMetrics.modelName}`);
    console.log(`  Domain: ${modelMetrics.domain}`);
    console.log(`  Accuracy: ${modelMetrics.accuracy}`);
    console.log(`  F1 Score: ${modelMetrics.f1Score}`);
    console.log(`  AUC: ${modelMetrics.auc}`);
    
    // Step 2: Research industry benchmarks
    console.log("\n🔍 Step 2: Researching industry benchmarks");
    
    const benchmarkContext = `${modelMetrics.domain} machine learning performance benchmarks 2024`;
    
    const benchmarkResearch = await researchIntegration.enrichAnalyticalContext(
      [modelMetrics.modelName],
      benchmarkContext,
      {
        numResults: 5,
        timeRangeMonths: 12,
        includeNewsResults: true,
        enhancedExtraction: true
      }
    );
    
    console.log(`Found ${benchmarkResearch.researchInsights.length} benchmark insights`);
    console.log("Sample benchmarks:");
    benchmarkResearch.researchInsights.slice(0, 3).forEach((insight, i) => {
      console.log(`  ${i+1}. ${insight}`);
    });
    
    // Step 3: Research feature importance norms
    console.log("\n🔍 Step 3: Researching feature importance norms");
    
    const featureContext = `most important predictive features for ${modelMetrics.domain}`;
    
    const featureResearch = await researchIntegration.enrichAnalyticalContext(
      modelMetrics.features,
      featureContext,
      {
        numResults: 4,
        timeRangeMonths: 12,
        includeNewsResults: false,
        enhancedExtraction: true
      }
    );
    
    console.log(`Found ${featureResearch.researchInsights.length} feature importance insights`);
    console.log("Feature importance insights:");
    featureResearch.researchInsights.slice(0, 3).forEach((insight, i) => {
      console.log(`  ${i+1}. ${insight}`);
    });
    
    // Step 4: Simulate dataset analysis 
    console.log("\n🔍 Step 4: Analyzing model dataset");
    
    // Simulated dataset structure for analysis
    const datasetDescription = {
      rowCount: 50000,
      columns: modelMetrics.features.concat([modelMetrics.targetVariable]),
      missingValues: 0.02,
      classImbalance: 0.18, // 18% churn rate
      dataSource: "Customer transactions 2023-2024",
      datasetType: "tabular"
    };
    
    // Perform statistical analysis
    const dataAnalysis = await analyzeDataset({
      dataset: JSON.stringify(datasetDescription),
      analyzeCorrelations: true,
      analyzeMissingValues: true,
      analyzeDistributions: true
    });
    
    console.log("Dataset analysis completed");
    
    // Step 5: Simulate model performance evaluation
    console.log("\n🔍 Step 5: Evaluating model performance");
    
    // Simulated regression analysis for feature importance
    const simFeatureImportance = {
      "subscription_length_months": 0.24,
      "monthly_charges": 0.18,
      "total_charges": 0.15,
      "contract_type": 0.14,
      "payment_method": 0.12,
      "customer_service_calls": 0.09,
      "age": 0.04,
      "gender": 0.02,
      "has_dependents": 0.02
    };
    
    // Evaluate model against industry benchmarks
    
    // Extract benchmark metrics from research
    let industryAccuracy = 0.75; // Default/fallback value
    let industryF1 = 0.70;       // Default/fallback value
    
    for (const insight of benchmarkResearch.researchInsights) {
      // Simple extraction of potential metrics
      if (insight.includes("accuracy") && insight.match(/\b0\.\d{2}\b/)) {
        const matches = insight.match(/\b0\.\d{2}\b/g);
        if (matches && matches.length > 0) {
          industryAccuracy = parseFloat(matches[0]);
        }
      }
      
      if (insight.includes("F1") && insight.match(/\b0\.\d{2}\b/)) {
        const matches = insight.match(/\b0\.\d{2}\b/g);
        if (matches && matches.length > 0) {
          industryF1 = parseFloat(matches[0]);
        }
      }
    }
    
    // Calculate performance vs benchmark
    const accuracyVsBenchmark = (modelMetrics.accuracy / industryAccuracy) - 1;
    const f1VsBenchmark = (modelMetrics.f1Score / industryF1) - 1;
    
    // Step 6: Generate comprehensive model evaluation report
    console.log("\n🔍 Step 6: Generating comprehensive evaluation report");
    
    // Extract key insights from research
    const keyInsights = [];
    
    // Add benchmark insights
    const benchmarkInsight = benchmarkResearch.researchInsights
      .find(i => i.includes("accuracy") || i.includes("performance") || i.includes("benchmark"));
    
    if (benchmarkInsight) {
      keyInsights.push(`Industry benchmark: ${benchmarkInsight}`);
    }
    
    // Add feature importance insights
    const featureInsight = featureResearch.researchInsights
      .find(i => i.includes("feature") || i.includes("predictor") || i.includes("important"));
    
    if (featureInsight) {
      keyInsights.push(`Feature importance: ${featureInsight}`);
    }
    
    // Determine overall rating
    let modelRating;
    const overallPerformance = (accuracyVsBenchmark + f1VsBenchmark) / 2;
    
    if (overallPerformance > 0.1) {
      modelRating = "Excellent - Above Industry Standards";
    } else if (overallPerformance > 0) {
      modelRating = "Good - Meets Industry Standards";
    } else if (overallPerformance > -0.1) {
      modelRating = "Fair - Slightly Below Industry Standards";
    } else {
      modelRating = "Poor - Significantly Below Industry Standards";
    }
    
    // Check feature alignment with research
    const topModelFeatures = Object.entries(simFeatureImportance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
    
    const featureAlignmentScore = benchmarkResearch.confidence * featureResearch.confidence;
    let featureAssessment;
    
    if (featureAlignmentScore > 0.7) {
      featureAssessment = "Strong feature alignment with industry research";
    } else if (featureAlignmentScore > 0.5) {
      featureAssessment = "Moderate feature alignment with industry research";
    } else {
      featureAssessment = "Poor feature alignment with industry research";
    }
    
    // Generate recommendations
    const recommendations = [];
    
    if (modelMetrics.accuracy < industryAccuracy) {
      recommendations.push("Improve model accuracy to meet industry benchmarks");
    }
    
    if (modelMetrics.recall < 0.75) {
      recommendations.push("Focus on improving recall to better identify at-risk customers");
    }
    
    if (featureAlignmentScore < 0.6) {
      recommendations.push("Consider additional features based on industry research");
    }
    
    // Print final report
    console.log("\n=== MODEL EVALUATION REPORT ===\n");
    console.log(`Model: ${modelMetrics.modelName}`);
    console.log(`Domain: ${modelMetrics.domain}`);
    console.log(`Overall Rating: ${modelRating}`);
    
    console.log("\nPerformance vs Industry Benchmarks:");
    console.log(`  Accuracy: ${modelMetrics.accuracy.toFixed(2)} (Industry: ${industryAccuracy.toFixed(2)}, ${(accuracyVsBenchmark * 100).toFixed(1)}% difference)`);
    console.log(`  F1 Score: ${modelMetrics.f1Score.toFixed(2)} (Industry: ${industryF1.toFixed(2)}, ${(f1VsBenchmark * 100).toFixed(1)}% difference)`);
    
    console.log("\nFeature Assessment:");
    console.log(`  ${featureAssessment}`);
    console.log("  Top Model Features:");
    topModelFeatures.forEach((feature, i) => {
      console.log(`    ${i+1}. ${feature} (Importance: ${(simFeatureImportance[feature] * 100).toFixed(1)}%)`);
    });
    
    console.log("\nKey Research Insights:");
    keyInsights.forEach((insight, i) => {
      console.log(`  ${i+1}. ${insight}`);
    });
    
    console.log("\nRecommendations:");
    recommendations.forEach((recommendation, i) => {
      console.log(`  ${i+1}. ${recommendation}`);
    });
    
    return {
      modelMetrics,
      benchmarkResearch,
      featureResearch,
      modelRating,
      performanceVsBenchmark: {
        accuracy: accuracyVsBenchmark,
        f1: f1VsBenchmark
      },
      recommendations
    };
  } catch (error) {
    console.error("Error in data-driven ML evaluation:", error);
    throw error;
  }
}

// Run the example if executed directly
if (process.argv[1].includes('data_driven_ml_evaluation.js')) {
  dataDrivernMLEvaluation()
    .then(() => console.log("\n✅ Data-Driven ML Evaluation Complete"))
    .catch(err => console.error("\n❌ Process failed:", err))
    .finally(() => process.exit());
}

export { dataDrivernMLEvaluation };
