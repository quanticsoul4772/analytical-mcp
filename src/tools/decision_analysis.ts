import { z } from "zod";

// Schema for the tool parameters
export const decisionAnalysisSchema = z.object({
  options: z.array(z.string()).describe("List of decision options to analyze"),
  criteria: z.array(z.string()).describe("List of criteria to evaluate options against"),
  weights: z.array(z.number()).optional().describe("Optional weights for each criterion (must match criteria length)")
});

// Tool implementation
export async function decisionAnalysis(
  options: string[], 
  criteria: string[], 
  weights?: number[]
): Promise<string> {
  // Validate inputs
  if (options.length === 0) {
    throw new Error("At least one option must be provided");
  }
  
  if (criteria.length === 0) {
    throw new Error("At least one criterion must be provided");
  }
  
  // Use equal weights if none provided
  const normalizedWeights = weights || criteria.map(() => 1 / criteria.length);
  
  // Validate weights length
  if (normalizedWeights.length !== criteria.length) {
    throw new Error(`Weights length (${normalizedWeights.length}) must match criteria length (${criteria.length})`);
  }
  
  // Generate random scores for demo purposes
  // In a real implementation, this would use real data or ask for user input
  const scores: number[][] = [];
  const pros: string[][] = [];
  const cons: string[][] = [];
  
  for (let i = 0; i < options.length; i++) {
    scores[i] = [];
    pros[i] = [];
    cons[i] = [];
    
    for (let j = 0; j < criteria.length; j++) {
      // Generate a random score between 1-10
      const score = Math.floor(Math.random() * 10) + 1;
      scores[i][j] = score;
      
      // Generate pros and cons based on score
      if (score >= 7) {
        pros[i].push(`Strong in "${criteria[j]}"`);
      } else if (score >= 4) {
        // No strong pro or con
      } else {
        cons[i].push(`Weak in "${criteria[j]}"`);
      }
    }
    
    // Add a few more realistic pros and cons
    if (Math.random() > 0.5) {
      pros[i].push("Implementation is straightforward");
    }
    
    if (Math.random() > 0.5) {
      cons[i].push("May require additional resources");
    }
    
    if (Math.random() > 0.7) {
      pros[i].push("Aligned with organizational goals");
    }
    
    if (Math.random() > 0.7) {
      cons[i].push("Potential regulatory challenges");
    }
  }
  
  // Calculate weighted scores
  const weightedScores = options.map((option, i) => {
    return scores[i].reduce((sum, score, j) => {
      return sum + score * normalizedWeights[j];
    }, 0);
  });
  
  // Rank options
  const rankedOptions = options
    .map((option, i) => ({
      option,
      score: weightedScores[i],
      pros: pros[i],
      cons: cons[i]
    }))
    .sort((a, b) => b.score - a.score);
  
  // Format output
  let result = `## Decision Analysis Results\n\n`;
  
  // Add ranked options
  result += `### Ranked Options\n\n`;
  rankedOptions.forEach((item, i) => {
    result += `**${i + 1}. ${item.option}** (Score: ${item.score.toFixed(2)})\n`;
  });
  
  // Add details for each option
  result += `\n### Detailed Analysis\n\n`;
  rankedOptions.forEach((item) => {
    result += `#### ${item.option} (Score: ${item.score.toFixed(2)})\n\n`;
    
    // Pros
    result += `**Pros:**\n`;
    if (item.pros.length > 0) {
      item.pros.forEach(pro => {
        result += `- ${pro}\n`;
      });
    } else {
      result += `- No significant advantages identified\n`;
    }
    
    // Cons
    result += `\n**Cons:**\n`;
    if (item.cons.length > 0) {
      item.cons.forEach(con => {
        result += `- ${con}\n`;
      });
    } else {
      result += `- No significant disadvantages identified\n`;
    }
    
    result += `\n`;
  });
  
  // Add recommendations
  const topOption = rankedOptions[0];
  result += `### Recommendation\n\n`;
  result += `Based on the analysis, **${topOption.option}** appears to be the strongest option with a score of ${topOption.score.toFixed(2)}.\n`;
  result += `Its key strengths include: ${topOption.pros.length > 0 ? topOption.pros.join(', ') : 'No significant pros identified'}.\n`;
  
  if (rankedOptions.length > 1) {
    const runnerUp = rankedOptions[1];
    result += `\nThe second-best option is **${runnerUp.option}** with a score of ${runnerUp.score.toFixed(2)}.\n`;
  }
  
  return result;
}
