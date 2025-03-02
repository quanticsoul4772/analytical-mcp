import { researchIntegration } from '../src/utils/research_integration';
import { decisionAnalysis } from '../build/tools/decision_analysis';
import { perspectiveShifter } from '../build/tools/perspective_shifter';

async function innovateMarketStrategy() {
  try {
    // Initial market data
    const marketOptions = [
      { strategy: 'Expand to new geographic market', risk: 0.3, potential: 0.7 },
      { strategy: 'Launch new product line', risk: 0.5, potential: 0.6 },
      { strategy: 'Strategic partnership', risk: 0.2, potential: 0.5 },
    ];

    // Enrich market strategy with research
    const enrichedResearch = await researchIntegration.enrichAnalyticalContext(
      marketOptions,
      'Technology market expansion strategies for 2024',
      {
        numResults: 7,
        timeRangeMonths: 6,
        includeNewsResults: true,
      }
    );

    console.log('Research Insights:', enrichedResearch.researchInsights);
    console.log('Research Confidence:', enrichedResearch.confidence);

    // Cross-domain analogies for innovation
    const crossDomainInsights = await researchIntegration.findCrossdomainAnalogies(
      'Technology market expansion strategies',
      ['technology', 'startups', 'innovation']
    );

    console.log('Cross-Domain Analogies:', crossDomainInsights.analogies);
    console.log('Potential Solutions:', crossDomainInsights.potentialSolutions);

    // Perform decision analysis with enriched data
    const strategyDecision = await decisionAnalysis({
      options: enrichedResearch.enrichedData.map((opt) => opt.strategy),
      criteria: [
        'Market Potential',
        'Risk Mitigation',
        'Research Insight Alignment',
        'Innovation Potential',
      ],
      weights: [0.3, 0.2, 0.25, 0.25],
    });

    console.log('Final Strategy Recommendation:', strategyDecision);

    // Generate alternative perspectives
    const innovationPerspectives = await perspectiveShifter({
      problem: 'How to innovate in our market strategy?',
      currentPerspective: 'Executive Management',
      shiftType: 'stakeholder',
      numberOfPerspectives: 3,
      includeActionable: true,
      contextEnrichment: crossDomainInsights.potentialSolutions,
    });

    console.log('Innovation Perspectives:', innovationPerspectives);
  } catch (error) {
    console.error('Market Strategy Innovation Error:', error);
  }
}

innovateMarketStrategy();
