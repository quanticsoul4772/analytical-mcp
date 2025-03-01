import { z } from "zod";

// Schema for the tool parameters
export const perspectiveShifterSchema = z.object({
  problem: z.string().describe("The problem or situation to analyze from different perspectives"),
  currentPerspective: z.string().optional().describe("The current perspective or approach (optional)"),
  shiftType: z.enum([
    "stakeholder", 
    "temporal", 
    "contrarian", 
    "disciplinary",
    "scale",
    "comprehensive"
  ]).default("comprehensive").describe("Type of perspective shift to generate"),
  numberOfPerspectives: z.number().min(1).max(10).default(3).describe("Number of alternative perspectives to generate"),
  includeActionable: z.boolean().default(true).describe("Include actionable insights for each perspective")
});

// Tool implementation
export async function perspectiveShifter(
  problem: string,
  currentPerspective?: string,
  shiftType: string = "comprehensive",
  numberOfPerspectives: number = 3,
  includeActionable: boolean = true
): Promise<string> {
  // Validate inputs
  if (!problem || problem.trim().length === 0) {
    throw new Error("A problem or situation must be provided for perspective shifting");
  }
  
  // Limit number of perspectives to a reasonable range
  numberOfPerspectives = Math.min(Math.max(numberOfPerspectives, 1), 10);
  
  // Determine which perspective shifts to include
  let perspectiveTypes: string[] = [];
  
  if (shiftType === "comprehensive") {
    // For comprehensive analysis, select a mix of perspective types
    perspectiveTypes = ["stakeholder", "temporal", "contrarian", "disciplinary", "scale"];
    // Ensure we don't exceed the requested number of perspectives
    perspectiveTypes = perspectiveTypes.slice(0, numberOfPerspectives);
  } else {
    // Generate the specified number of perspectives of the requested type
    perspectiveTypes = Array(numberOfPerspectives).fill(shiftType);
  }
  
  // Build the result
  let result = `## Perspective Shifting Analysis\n\n`;
  
  // Add the problem statement for reference
  result += `### Problem Statement\n\n${problem}\n\n`;
  
  // Add current perspective if provided
  if (currentPerspective && currentPerspective.trim().length > 0) {
    result += `### Current Perspective\n\n${currentPerspective}\n\n`;
  }
  
  // Generate alternative perspectives
  result += `### Alternative Perspectives\n\n`;
  
  // Generate perspectives based on the selected types
  const generatedPerspectives = perspectiveTypes.map((type, index) => {
    return generatePerspective(problem, currentPerspective, type, index + 1, includeActionable);
  });
  
  // Add perspectives to result
  generatedPerspectives.forEach(perspective => {
    result += perspective;
  });
  
  // Add recommendations for combining perspectives
  result += `### Integrating Multiple Perspectives\n\n`;
  result += `When confronting complex problems, integrating insights from multiple perspectives often leads to more robust solutions. Consider these approaches:\n\n`;
  result += `1. **Look for Common Themes**: Identify patterns or insights that emerge across different perspectives.\n\n`;
  result += `2. **Bridge Opposing Views**: Find ways to accommodate seemingly contradictory perspectives by reframing the problem.\n\n`;
  result += `3. **Sequential Implementation**: Consider if different perspectives might be relevant at different stages of addressing the problem.\n\n`;
  result += `4. **Weighted Synthesis**: Give more weight to perspectives that align better with your core values or constraints.\n\n`;
  result += `5. **Creative Recombination**: Mix elements from different perspectives to create novel approaches that wouldn't be visible from any single viewpoint.\n\n`;
  
  return result;
}

// Function to generate a perspective of a specific type
function generatePerspective(
  problem: string,
  currentPerspective?: string,
  perspectiveType: string = "stakeholder",
  index: number = 1,
  includeActionable: boolean = true
): string {
  let result = `#### Perspective ${index}: `;
  
  // Analyze the problem to understand its domain
  const domainKeywords = analyzeProblemDomain(problem);
  
  // Generate perspective based on type
  switch (perspectiveType) {
    case "stakeholder":
      result += generateStakeholderPerspective(problem, domainKeywords, includeActionable);
      break;
    case "temporal":
      result += generateTemporalPerspective(problem, domainKeywords, includeActionable);
      break;
    case "contrarian":
      result += generateContrarianPerspective(problem, currentPerspective, domainKeywords, includeActionable);
      break;
    case "disciplinary":
      result += generateDisciplinaryPerspective(problem, domainKeywords, includeActionable);
      break;
    case "scale":
      result += generateScalePerspective(problem, domainKeywords, includeActionable);
      break;
    default:
      // Default to stakeholder perspective if type is unknown
      result += generateStakeholderPerspective(problem, domainKeywords, includeActionable);
  }
  
  return result;
}

// Helper function to analyze problem domain based on keywords
function analyzeProblemDomain(problem: string): any {
  const lowerProblem = problem.toLowerCase();
  
  const domains = {
    business: ["business", "company", "market", "profit", "customer", "product", "service", "sales", "revenue", "strategy", "management", "employee", "team", "organization", "corporate"],
    technology: ["technology", "software", "hardware", "app", "data", "digital", "computer", "internet", "website", "online", "device", "system", "network", "code", "programming"],
    education: ["education", "school", "learning", "teaching", "student", "teacher", "classroom", "curriculum", "course", "academic", "knowledge", "skill", "train", "university", "college"],
    health: ["health", "medical", "doctor", "patient", "hospital", "disease", "treatment", "care", "wellness", "therapy", "medication", "symptom", "diagnosis", "illness", "healthcare"],
    environment: ["environment", "climate", "sustainability", "pollution", "renewable", "energy", "waste", "conservation", "ecosystem", "green", "carbon", "recycle", "natural", "resource", "planet"],
    social: ["community", "social", "people", "relationship", "communication", "culture", "society", "public", "group", "family", "friend", "network", "interaction", "connection", "engagement"],
    personal: ["personal", "individual", "self", "life", "goal", "habit", "time", "productivity", "balance", "stress", "emotion", "wellbeing", "motivation", "mindset", "growth"],
    political: ["policy", "government", "political", "regulation", "law", "public", "rights", "election", "vote", "citizen", "national", "international", "freedom", "equality", "democracy"],
    economic: ["economic", "economy", "financial", "money", "budget", "cost", "investment", "market", "price", "value", "fund", "resource", "trade", "asset", "income"]
  };
  
  // Count domain keyword occurrences
  const domainCounts = Object.entries(domains).reduce((counts, [domain, keywords]) => {
    const count = keywords.reduce((sum, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lowerProblem.match(regex);
      return sum + (matches ? matches.length : 0);
    }, 0);
    
    counts[domain] = count;
    return counts;
  }, {} as Record<string, number>);
  
  // Find the dominant domains (those with the highest counts)
  const maxCount = Math.max(...Object.values(domainCounts));
  const dominantDomains = Object.entries(domainCounts)
    .filter(([_, count]) => count > 0 && count >= maxCount * 0.5) // Include domains with at least 50% of the max count
    .map(([domain, _]) => domain);
  
  return {
    dominantDomains,
    allDomains: domainCounts
  };
}

// Function to generate a stakeholder perspective
function generateStakeholderPerspective(
  problem: string,
  domainKeywords: any,
  includeActionable: boolean
): string {
  let result = `**Stakeholder Perspective**\n\n`;
  
  // Choose a stakeholder based on the problem domain
  let stakeholders: string[] = [];
  const domains = domainKeywords.dominantDomains;
  
  if (domains.includes("business")) {
    stakeholders = ["customers", "employees", "shareholders", "suppliers", "competitors", "community members"];
  } else if (domains.includes("technology")) {
    stakeholders = ["users", "developers", "content creators", "platform owners", "regulators", "accessibility advocates"];
  } else if (domains.includes("education")) {
    stakeholders = ["students", "teachers", "parents", "administrators", "employers", "education researchers"];
  } else if (domains.includes("health")) {
    stakeholders = ["patients", "healthcare providers", "insurance companies", "family caregivers", "medical researchers", "public health officials"];
  } else if (domains.includes("environment")) {
    stakeholders = ["local communities", "future generations", "wildlife", "environmental organizations", "industry", "policymakers"];
  } else if (domains.includes("social")) {
    stakeholders = ["individuals directly affected", "families", "community leaders", "social service providers", "advocacy groups", "the general public"];
  } else if (domains.includes("political")) {
    stakeholders = ["citizens", "policymakers", "government agencies", "opposition groups", "international community", "marginalized communities"];
  } else {
    // Default set of stakeholders for any problem domain
    stakeholders = ["direct beneficiaries", "indirect beneficiaries", "implementers", "decision-makers", "potential opponents", "resource providers"];
  }
  
  // Randomly select a stakeholder to focus on (in a real implementation, this would be more strategic)
  const stakeholder = stakeholders[Math.floor(Math.random() * stakeholders.length)];
  
  result += `**From the perspective of ${stakeholder}:**\n\n`;
  
  // Generate key considerations for this stakeholder
  let considerations = "";
  
  if (stakeholder === "customers" || stakeholder === "users" || stakeholder.includes("benefit")) {
    considerations = "This stakeholder is primarily concerned with the value they receive, the problems solved, and the experience provided. They may prioritize ease of use, affordability, and tangible benefits over technical sophistication or business efficiency.";
  } else if (stakeholder === "employees" || stakeholder === "developers" || stakeholder.includes("implementer")) {
    considerations = "This stakeholder is concerned with the practicality and implementation details. They may focus on workload implications, required resources, skill development needs, and maintenance considerations that might not be immediately visible to decision-makers.";
  } else if (stakeholder === "shareholders" || stakeholder === "resource providers" || stakeholder.includes("decision")) {
    considerations = "This stakeholder focuses on return on investment, long-term sustainability, and alignment with strategic objectives. Their perspective emphasizes accountability, measured outcomes, and efficient resource allocation.";
  } else if (stakeholder.includes("community") || stakeholder.includes("public") || stakeholder.includes("generations")) {
    considerations = "This stakeholder considers broader social impact, equity, sustainability, and long-term consequences. Their perspective extends beyond immediate outcomes to include indirect effects and ethical considerations that might be overlooked by more directly involved parties.";
  } else {
    considerations = "This stakeholder brings a unique perspective shaped by their specific needs, constraints, and values. They may identify unintended consequences, overlooked opportunities, or alternative priorities that could significantly impact the problem's resolution.";
  }
  
  result += considerations + "\n\n";
  
  // Add how this perspective shifts understanding of the problem
  result += "**How this shifts understanding of the problem:**\n\n";
  result += `Viewing the problem from the ${stakeholder} perspective reveals:\n\n`;
  result += `1. Different priorities and success criteria than might be assumed by default\n`;
  result += `2. Potential implementation challenges or resistance points\n`;
  result += `3. Critical context about real-world constraints and opportunities\n`;
  result += `4. Ethical dimensions that might be overlooked from a purely technical or business perspective\n\n`;
  
  // Add actionable insights if requested
  if (includeActionable) {
    result += "**Actionable insights:**\n\n";
    result += `- Directly engage with ${stakeholder} through surveys, interviews, or focus groups to validate assumptions\n`;
    result += `- Create personas or user stories that capture the ${stakeholder} perspective to guide decision-making\n`;
    result += `- Include ${stakeholder} representatives in planning and review processes\n`;
    result += `- Develop specific success metrics that align with ${stakeholder} priorities\n\n`;
  }
  
  return result;
}

// Function to generate a temporal perspective
function generateTemporalPerspective(
  problem: string,
  domainKeywords: any,
  includeActionable: boolean
): string {
  let result = `**Temporal Perspective**\n\n`;
  
  // Choose a temporal frame based on the problem domain
  const temporalFrames = ["immediate term (days/weeks)", "short term (months)", "medium term (1-3 years)", "long term (5-10 years)", "generational (decades)"];
  
  // Randomly select a temporal frame (in a real implementation, this would be more strategic)
  const temporalFrame = temporalFrames[Math.floor(Math.random() * temporalFrames.length)];
  
  result += `**From a ${temporalFrame} perspective:**\n\n`;
  
  // Generate key considerations for this temporal frame
  let considerations = "";
  
  if (temporalFrame.includes("immediate")) {
    considerations = "This timeframe focuses on urgent actions and quick wins. It prioritizes addressing immediate symptoms and leveraging existing resources rather than fundamental redesign. This perspective is valuable for crisis management or capturing time-sensitive opportunities, but may miss underlying systemic issues.";
  } else if (temporalFrame.includes("short term")) {
    considerations = "This timeframe balances immediate needs with the beginning of more structural solutions. It allows for modest process changes and capability building while delivering observable results. This perspective helps bridge immediate concerns with longer-term direction.";
  } else if (temporalFrame.includes("medium term")) {
    considerations = "This timeframe enables more substantial system redesign and capability development. It provides room for testing and refining new approaches while still maintaining accountability for results. This perspective reveals transition challenges and adaptation requirements that shorter timeframes might miss.";
  } else if (temporalFrame.includes("long term")) {
    considerations = "This timeframe allows for fundamental transformation and strategic repositioning. It reveals slow-moving trends and potential future states that might be invisible in shorter perspectives. This view can uncover opportunities for innovation and preparation for emerging challenges.";
  } else if (temporalFrame.includes("generational")) {
    considerations = "This timeframe considers multi-decade impacts and legacy outcomes. It prioritizes sustainability, adaptability, and values transmission. This perspective reveals ethical dimensions and potential unintended consequences that might be completely invisible in shorter timeframes.";
  }
  
  result += considerations + "\n\n";
  
  // Add how this perspective shifts understanding of the problem
  result += "**How this shifts understanding of the problem:**\n\n";
  result += `Viewing the problem from a ${temporalFrame} perspective reveals:\n\n`;
  result += `1. Different priority elements than would be visible in other timeframes\n`;
  result += `2. Potential unintended consequences or long-term implications\n`;
  result += `3. Natural evolution patterns that might resolve certain aspects or create new ones\n`;
  result += `4. Investment vs. payoff considerations that affect solution viability\n\n`;
  
  // Add actionable insights if requested
  if (includeActionable) {
    result += "**Actionable insights:**\n\n";
    
    if (temporalFrame.includes("immediate")) {
      result += `- Identify triage actions that can be implemented within days\n`;
      result += `- Create rapid feedback loops to quickly adjust tactics\n`;
      result += `- Focus on leveraging existing resources rather than creating new systems\n`;
      result += `- Document quick fixes that may need more sustainable solutions later\n\n`;
    } else if (temporalFrame.includes("short term")) {
      result += `- Develop 90-day action plans with concrete milestones\n`;
      result += `- Begin building capabilities needed for medium-term solutions\n`;
      result += `- Create monitoring systems to track progress and identify issues early\n`;
      result += `- Balance quick wins with laying groundwork for sustainable solutions\n\n`;
    } else if (temporalFrame.includes("medium term")) {
      result += `- Create roadmaps with 1-3 year horizons and key transition points\n`;
      result += `- Invest in capability building and organizational learning\n`;
      result += `- Develop pilots to test more fundamental solution approaches\n`;
      result += `- Consider partnership and ecosystem development strategies\n\n`;
    } else if (temporalFrame.includes("long term")) {
      result += `- Conduct scenario planning to identify robust strategies across possible futures\n`;
      result += `- Consider investment in fundamental innovation and research\n`;
      result += `- Develop adaptive strategies that can evolve as conditions change\n`;
      result += `- Identify potential disruptors or game-changing opportunities\n\n`;
    } else if (temporalFrame.includes("generational")) {
      result += `- Incorporate sustainability principles and circular design thinking\n`;
      result += `- Consider impact on future generations and intergenerational equity\n`;
      result += `- Develop governance structures for long-term stewardship\n`;
      result += `- Build values and principles that can guide adaptation over decades\n\n`;
    }
  }
  
  return result;
}

// Function to generate a contrarian perspective
function generateContrarianPerspective(
  problem: string,
  currentPerspective?: string,
  domainKeywords?: any,
  includeActionable: boolean = true
): string {
  let result = `**Contrarian Perspective**\n\n`;
  
  // Identify key assumptions to challenge
  const assumptions = identifyAssumptions(problem, currentPerspective);
  
  // Select a significant assumption to challenge (in a real implementation, would be more strategic)
  const assumption = assumptions[Math.floor(Math.random() * assumptions.length)];
  
  result += `**Challenging the assumption: "${assumption}"**\n\n`;
  
  // Generate the contrarian perspective
  result += `What if the opposite is true? This perspective explores the possibility that ${assumption.toLowerCase().startsWith('the') || assumption.toLowerCase().startsWith('there') ? assumption.toLowerCase() : 'the ' + assumption.toLowerCase()} is actually not the case.\n\n`;
  
  // Add how this perspective shifts understanding of the problem
  result += "**How this shifts understanding of the problem:**\n\n";
  result += `Challenging this fundamental assumption reveals:\n\n`;
  result += `1. Hidden constraints we've been unnecessarily accepting\n`;
  result += `2. Alternative solution paths that were previously invisible\n`;
  result += `3. Potential areas where conventional wisdom may be outdated or misapplied\n`;
  result += `4. Opportunities for disruptive or innovative approaches\n\n`;
  
  // Add actionable insights if requested
  if (includeActionable) {
    result += "**Actionable insights:**\n\n";
    result += `- Explicitly test the challenged assumption through targeted research or experiments\n`;
    result += `- Develop a "plan B" approach that would be optimal if the assumption is false\n`;
    result += `- Identify the minimum viable test to validate or invalidate this assumption\n`;
    result += `- Gather diverse perspectives specifically on this assumption to identify blind spots\n`;
    result += `- Look for analogous situations where the conventional assumption proved incorrect\n\n`;
  }
  
  return result;
}

// Helper function to identify assumptions in a problem statement
function identifyAssumptions(problem: string, currentPerspective?: string): string[] {
  // This is a simplified implementation - in a real system, this would be more sophisticated
  const commonAssumptions = [
    "The current approach is the best available option",
    "More resources would solve the problem",
    "Technology is the appropriate solution",
    "The problem needs to be solved completely",
    "The problem is correctly defined",
    "There is a single root cause",
    "All stakeholders share the same goals",
    "Solving this quickly is essential",
    "Previous solutions failed due to poor execution",
    "We need to maintain the current system",
    "Expert opinions are reliable in this domain",
    "This problem is unique to our situation",
    "The benefits will outweigh the costs",
    "We understand what success looks like",
    "The solution needs to be comprehensive"
  ];
  
  // If we have a current perspective, analyze it for specific assumptions
  if (currentPerspective && currentPerspective.trim().length > 0) {
    const specificAssumptions = extractSpecificAssumptions(currentPerspective);
    return [...specificAssumptions, ...commonAssumptions].slice(0, 10); // Return a mix of specific and common
  }
  
  // Otherwise just return common assumptions
  return commonAssumptions;
}

// Helper function to extract specific assumptions from text
function extractSpecificAssumptions(text: string): string[] {
  // This is a simplified implementation - in a real system, this would use NLP techniques
  
  // Look for phrases that often indicate assumptions
  const assumptionIndicators = [
    "we need to", "we must", "obviously", "clearly", "certainly", 
    "everyone knows", "always", "never", "all", "none", "best",
    "only", "undoubtedly", "definitely", "essential", "necessary"
  ];
  
  const lines = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const potentialAssumptions: string[] = [];
  
  // Look for sentences containing assumption indicators
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (assumptionIndicators.some(indicator => lowerLine.includes(indicator.toLowerCase()))) {
      potentialAssumptions.push(line.trim());
    }
  }
  
  return potentialAssumptions.length > 0 ? potentialAssumptions : [];
}

// Function to generate a disciplinary perspective
function generateDisciplinaryPerspective(
  problem: string,
  domainKeywords: any,
  includeActionable: boolean
): string {
  let result = `**Disciplinary Perspective**\n\n`;
  
  // Define disciplines across domains
  const disciplines = {
    general: [
      { name: "Systems Thinking", focus: "interconnections, feedback loops, and emergent properties" },
      { name: "Design Thinking", focus: "user needs, empathy, and iterative problem-solving" },
      { name: "Behavioral Economics", focus: "decision-making biases and behavioral incentives" },
      { name: "Complexity Science", focus: "self-organization, adaptation, and non-linear dynamics" },
      { name: "Anthropology", focus: "cultural perspectives and social practices" }
    ],
    business: [
      { name: "Strategic Management", focus: "competitive advantage and organizational positioning" },
      { name: "Marketing", focus: "customer needs, value proposition, and market positioning" },
      { name: "Operations Management", focus: "process efficiency, quality, and consistency" },
      { name: "Organizational Behavior", focus: "human dynamics, motivation, and change management" },
      { name: "Finance", focus: "resource allocation, risk management, and value creation" }
    ],
    technology: [
      { name: "Human-Computer Interaction", focus: "user experience and design affordances" },
      { name: "Data Science", focus: "pattern recognition and evidence-based decision making" },
      { name: "Information Security", focus: "trust, vulnerability, and defense-in-depth" },
      { name: "Network Theory", focus: "connection patterns and information flow" },
      { name: "Artificial Intelligence", focus: "automation, learning systems, and augmented capabilities" }
    ],
    social: [
      { name: "Social Psychology", focus: "group dynamics, social influence, and collective behavior" },
      { name: "Conflict Resolution", focus: "negotiation, mediation, and collaborative problem-solving" },
      { name: "Game Theory", focus: "strategic interactions and incentive structures" },
      { name: "Sociology", focus: "social structures, institutions, and cultural patterns" },
      { name: "Communication Theory", focus: "information transfer, meaning-making, and discourse" }
    ],
    environment: [
      { name: "Ecology", focus: "ecosystem relationships and environmental balance" },
      { name: "Circular Economy", focus: "regenerative design and resource cycles" },
      { name: "Environmental Science", focus: "biogeochemical processes and natural systems" },
      { name: "Sustainability Science", focus: "long-term viability and intergenerational equity" },
      { name: "Urban Planning", focus: "spatial organization and built environment impacts" }
    ]
  };
  
  // Choose disciplines based on problem domain
  let relevantDisciplines = [...disciplines.general];
  
  const domains = domainKeywords.dominantDomains;
  
  // Add domain-specific disciplines if applicable
  domains.forEach(domain => {
    if (disciplines[domain as keyof typeof disciplines]) {
      relevantDisciplines = [...relevantDisciplines, ...disciplines[domain as keyof typeof disciplines]];
    }
  });
  
  // Select a discipline (in a real implementation, this would be more strategic)
  const discipline = relevantDisciplines[Math.floor(Math.random() * relevantDisciplines.length)];
  
  result += `**From a ${discipline.name} perspective:**\n\n`;
  result += `This discipline focuses on ${discipline.focus}. When applied to this problem, it offers unique insights that might not be visible from conventional approaches.\n\n`;
  
  // Add how this perspective shifts understanding of the problem
  result += "**How this shifts understanding of the problem:**\n\n";
  result += `Viewing the problem through a ${discipline.name} lens reveals:\n\n`;
  result += `1. Different analytical frameworks and conceptual models\n`;
  result += `2. Specialized tools and methodologies that can be applied\n`;
  result += `3. Historical patterns and established principles from this field\n`;
  result += `4. Alternative success metrics and evaluation approaches\n\n`;
  
  // Add discipline-specific insights
  result += "**Key disciplinary insights:**\n\n";
  
  if (discipline.name === "Systems Thinking") {
    result += `- Look beyond isolated components to understand how elements interact\n`;
    result += `- Identify feedback loops that may be amplifying or dampening effects\n`;
    result += `- Consider how interventions may trigger unintended consequences\n`;
    result += `- Map the boundaries of the system and key external influences\n`;
  } else if (discipline.name === "Design Thinking") {
    result += `- Center on the human experience and emotional needs, not just functional requirements\n`;
    result += `- Use rapid prototyping to test multiple approaches before committing\n`;
    result += `- Reframe the problem statement to open new solution possibilities\n`;
    result += `- Balance desirability, feasibility, and viability in solution development\n`;
  } else if (discipline.name === "Behavioral Economics") {
    result += `- Examine how choice architecture influences decisions and actions\n`;
    result += `- Look for cognitive biases affecting how the problem is perceived\n`;
    result += `- Consider how default options and friction points shape behaviors\n`;
    result += `- Design nudges that align incentives with desired outcomes\n`;
  } else {
    result += `- Apply specialized analytical frameworks from ${discipline.name}\n`;
    result += `- Consider how experts in this field would frame the central challenges\n`;
    result += `- Identify relevant principles and best practices from this discipline\n`;
    result += `- Explore case studies of similar problems addressed through this lens\n`;
  }
  
  result += `\n`;
  
  // Add actionable insights if requested
  if (includeActionable) {
    result += "**Actionable insights:**\n\n";
    result += `- Consult with experts in ${discipline.name} or review relevant literature\n`;
    result += `- Apply key methodologies from this discipline to analyze the problem\n`;
    result += `- Identify successful case studies from this field that may offer parallels\n`;
    result += `- Incorporate discipline-specific metrics into your evaluation framework\n`;
    result += `- Consider how this perspective might complement other approaches\n\n`;
  }
  
  return result;
}

// Function to generate a scale perspective
function generateScalePerspective(
  problem: string,
  domainKeywords: any,
  includeActionable: boolean
): string {
  let result = `**Scale Perspective**\n\n`;
  
  // Define different scales of analysis
  const scales = [
    { name: "Micro (Individual)", focus: "personal experience, individual behavior, and direct interactions" },
    { name: "Meso (Group/Organization)", focus: "team dynamics, organizational structures, and local systems" },
    { name: "Macro (Societal/Industry)", focus: "market forces, social trends, and institutional frameworks" },
    { name: "Meta (Paradigmatic)", focus: "underlying mental models, paradigms, and systemic patterns" }
  ];
  
  // Select a scale (in a real implementation, this would be more strategic)
  const scale = scales[Math.floor(Math.random() * scales.length)];
  
  result += `**From a ${scale.name} perspective:**\n\n`;
  result += `This scale focuses on ${scale.focus}. Shifting to this level of analysis reveals different aspects of the problem that might be overlooked at other scales.\n\n`;
  
  // Add how this perspective shifts understanding of the problem
  result += "**How this shifts understanding of the problem:**\n\n";
  result += `Viewing the problem at the ${scale.name} scale reveals:\n\n`;
  
  if (scale.name.includes("Micro")) {
    result += `1. How the problem manifests in individual experiences and behaviors\n`;
    result += `2. Personal constraints, motivations, and decision processes\n`;
    result += `3. Specific touchpoints and interactions that create friction\n`;
    result += `4. Opportunities for personalization and direct intervention\n\n`;
  } else if (scale.name.includes("Meso")) {
    result += `1. How group dynamics and organizational structures shape the problem\n`;
    result += `2. Process flows, information sharing, and coordination challenges\n`;
    result += `3. Cultural factors and informal systems at play\n`;
    result += `4. Leverage points within team or organizational design\n\n`;
  } else if (scale.name.includes("Macro")) {
    result += `1. How broader societal trends and market forces influence the situation\n`;
    result += `2. Regulatory, economic, and policy considerations\n`;
    result += `3. Industry patterns and competitive dynamics\n`;
    result += `4. Large-scale systemic factors creating constraints or opportunities\n\n`;
  } else if (scale.name.includes("Meta")) {
    result += `1. How underlying assumptions and mental models shape our approach\n`;
    result += `2. Historic patterns that repeat across different contexts\n`;
    result += `3. Paradigmatic limitations in how the problem is framed\n`;
    result += `4. Opportunities for transformative rather than incremental change\n\n`;
  }
  
  // Add actionable insights if requested
  if (includeActionable) {
    result += "**Actionable insights:**\n\n";
    
    if (scale.name.includes("Micro")) {
      result += `- Conduct user research to understand individual experiences\n`;
      result += `- Map personal journeys and emotion points\n`;
      result += `- Design interventions targeting specific behaviors\n`;
      result += `- Create personalized approaches rather than one-size-fits-all solutions\n\n`;
    } else if (scale.name.includes("Meso")) {
      result += `- Analyze organizational structures and process flows\n`;
      result += `- Conduct stakeholder mapping and influence analysis\n`;
      result += `- Identify team-level metrics and incentive structures\n`;
      result += `- Consider interventions in workflow design and communication patterns\n\n`;
    } else if (scale.name.includes("Macro")) {
      result += `- Research industry trends and competitive landscape\n`;
      result += `- Analyze regulatory environment and policy considerations\n`;
      result += `- Consider market-level incentives and structural barriers\n`;
      result += `- Develop strategies for influencing system-level change\n\n`;
    } else if (scale.name.includes("Meta")) {
      result += `- Examine foundational assumptions and mental models\n`;
      result += `- Consider historical patterns across similar situations\n`;
      result += `- Explore alternative paradigms and framing approaches\n`;
      result += `- Look for opportunities to address root paradigms rather than symptoms\n\n`;
    }
  }
  
  return result;
}
