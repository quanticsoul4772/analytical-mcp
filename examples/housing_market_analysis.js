// Housing Market Regression and Decision Analysis Example
import { advancedRegressionAnalysis } from '../build/tools/advanced_regression_analysis.js';
import { decisionAnalysis } from '../build/tools/decision_analysis.js';

// Sample housing market dataset
// Multivariate regression fits an intercept plus one coefficient per
// independent variable (4 here), so at least 6 observations are required.
const housingData = [
  { area: 1000, bedrooms: 2, age: 10, price: 200000, location_score: 7 },
  { area: 1500, bedrooms: 3, age: 5, price: 300000, location_score: 8 },
  { area: 2000, bedrooms: 4, age: 15, price: 400000, location_score: 6 },
  { area: 1200, bedrooms: 2, age: 8, price: 250000, location_score: 7 },
  { area: 1800, bedrooms: 3, age: 12, price: 350000, location_score: 8 },
  { area: 1400, bedrooms: 3, age: 6, price: 275000, location_score: 7 },
  { area: 2200, bedrooms: 4, age: 20, price: 420000, location_score: 5 }
];

async function performHousingMarketAnalysis() {
  try {
    // Multivariate Regression Analysis
    const regressionModel = await advancedRegressionAnalysis({
      data: housingData,
      regressionType: 'multivariate',
      independentVariables: ['area', 'bedrooms', 'age', 'location_score'],
      dependentVariable: 'price',
      includeMetrics: true,
      includeCoefficients: true
    });
    console.log("Housing Price Regression Model:", regressionModel);

    // Decision Analysis for Investment Strategies
    // scores[i][j] rates option i against criterion j on a 0-10 scale, where a
    // higher score is always more favorable (e.g. for "Investment Required",
    // a high score means little capital is needed).
    const investmentDecision = await decisionAnalysis({
      options: [
        'Buy and Hold',
        'Renovate and Sell',
        'Convert to Rental Property',
        'Wait for Market Improvement'
      ],
      criteria: [
        'Potential Profit',
        'Investment Required',
        'Time to Realize Returns',
        'Market Risk'
      ],
      scores: [
        [6, 7, 4, 8], // Buy and Hold
        [8, 4, 7, 5], // Renovate and Sell
        [7, 5, 3, 7], // Convert to Rental Property
        [3, 9, 2, 5]  // Wait for Market Improvement
      ],
      weights: [0.4, 0.3, 0.2, 0.1]
    });
    console.log("Investment Strategy Decision:", investmentDecision);

  } catch (error) {
    console.error("Analysis Error:", error);
  }
}

performHousingMarketAnalysis();
