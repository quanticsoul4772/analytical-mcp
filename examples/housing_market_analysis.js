// Housing Market Regression and Decision Analysis Example
import { advancedRegressionAnalysis } from '../build/tools/advanced_regression_analysis.js';
import { decisionAnalysis } from '../build/tools/decision_analysis.js';

// Sample housing market dataset
const housingData = [
  { area: 1000, bedrooms: 2, age: 10, price: 200000, location_score: 7 },
  { area: 1500, bedrooms: 3, age: 5, price: 300000, location_score: 8 },
  { area: 2000, bedrooms: 4, age: 15, price: 400000, location_score: 6 },
  { area: 1200, bedrooms: 2, age: 8, price: 250000, location_score: 7 },
  { area: 1800, bedrooms: 3, age: 12, price: 350000, location_score: 8 }
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
      weights: [0.4, 0.3, 0.2, 0.1]
    });
    console.log("Investment Strategy Decision:", investmentDecision);

  } catch (error) {
    console.error("Analysis Error:", error);
  }
}

performHousingMarketAnalysis();
