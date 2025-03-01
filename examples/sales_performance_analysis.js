// Sales Performance Analysis Example
import { analyzeDataset } from '../build/tools/analyze_dataset.js';
import { hypothesisTesting } from '../build/tools/hypothesis_testing.js';
import { dataVisualizationGenerator } from '../build/tools/data_visualization_generator.js';

// Sample sales data for two different quarters
const salesData2023Q3 = [
  { quarter: 'Q3 2023', revenue: 100000, marketing_spend: 15000, customer_acquisition: 500 },
  { quarter: 'Q3 2023', revenue: 105000, marketing_spend: 16000, customer_acquisition: 520 },
  { quarter: 'Q3 2023', revenue: 98000, marketing_spend: 14500, customer_acquisition: 490 }
];

const salesData2023Q4 = [
  { quarter: 'Q4 2023', revenue: 120000, marketing_spend: 18000, customer_acquisition: 600 },
  { quarter: 'Q4 2023', revenue: 125000, marketing_spend: 19000, customer_acquisition: 620 },
  { quarter: 'Q4 2023', revenue: 115000, marketing_spend: 17500, customer_acquisition: 580 }
];

async function performSalesAnalysis() {
  try {
    // Descriptive Analysis for Q3
    const q3Analysis = await analyzeDataset({
      data: salesData2023Q3,
      analysisType: 'stats'
    });
    console.log("Q3 Sales Analysis:", q3Analysis);

    // Descriptive Analysis for Q4
    const q4Analysis = await analyzeDataset({
      data: salesData2023Q4,
      analysisType: 'stats'
    });
    console.log("Q4 Sales Analysis:", q4Analysis);

    // Hypothesis Testing: Compare Revenue between Q3 and Q4
    const revenueTest = await hypothesisTesting({
      testType: 't_test_independent',
      data: [
        salesData2023Q3.map(item => item.revenue),
        salesData2023Q4.map(item => item.revenue)
      ],
      variables: ['Q3 Revenue', 'Q4 Revenue'],
      alpha: 0.05,
      alternativeHypothesis: 'two_sided'
    });
    console.log("Revenue Comparison Test:", revenueTest);

    // Visualization of Sales Data
    const salesVisualization = await dataVisualizationGenerator({
      data: [...salesData2023Q3, ...salesData2023Q4],
      visualizationType: 'bar',
      variables: ['quarter', 'revenue'],
      title: 'Quarterly Sales Performance',
      includeTrendline: true
    });
    console.log("Sales Visualization Spec:", salesVisualization);

  } catch (error) {
    console.error("Analysis Error:", error);
  }
}

performSalesAnalysis();
