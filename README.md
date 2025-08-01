# Analytical MCP Server

[![Node.js CI](https://github.com/quanticsoul4772/analytical-mcp/actions/workflows/npm-gulp.yml/badge.svg)](https://github.com/quanticsoul4772/analytical-mcp/actions/workflows/npm-gulp.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.0+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive Model Context Protocol (MCP) server that provides advanced analytical capabilities including statistical analysis, decision-making support, logical reasoning, and research verification tools. Designed to enhance AI workflows with structured problem-solving and analytical reasoning capabilities.

## 🚀 Quick Start

**Get up and running in under 5 minutes:**

```bash
# Clone and install
git clone https://github.com/quanticsoul4772/analytical-mcp.git
cd analytical-mcp
npm install

# Configure environment
cp .env.example .env
# Add your EXA_API_KEY to .env (optional, for research features)

# Build and test
npm run build
npm run test:quick

# Start the MCP inspector for testing
npm run inspector
```
⏱️ **Time to first analysis: ~3 minutes**

## 📊 What Can It Do?

### Statistical Analysis
- **Dataset Analysis**: Comprehensive descriptive statistics, distribution analysis
- **Advanced Regression**: Linear, polynomial, logistic, and multivariate regression
- **Hypothesis Testing**: t-tests, correlation analysis, ANOVA
- **Data Visualization**: Generate specifications for charts, plots, and visualizations

### Decision Support
- **Multi-Criteria Analysis**: Weighted decision analysis with sensitivity testing
- **Risk Assessment**: Uncertainty quantification and tradeoff analysis
- **Alternative Evaluation**: Systematic comparison of options and outcomes

### Logical Reasoning
- **Argument Analysis**: Structure breakdown, validity and strength assessment
- **Fallacy Detection**: Identify and explain logical fallacies with confidence scores
- **Perspective Generation**: Generate alternative viewpoints and contrarian analysis

### Research Verification
- **Cross-Source Validation**: Verify claims across multiple reliable sources
- **Fact Extraction**: Advanced NLP-based fact extraction with confidence scoring
- **Consistency Analysis**: Identify conflicting information and assess reliability

## 🛠 Setup

### Prerequisites
- **Node.js** >= 20.0.0 ([Download](https://nodejs.org/))
- **Git** for cloning the repository
- **EXA API Key** (optional, for research features) - [Get one here](https://exa.ai/)

### Installation Options

#### Option 1: Direct Installation
```bash
npm install
npm run build
```

#### Option 2: Docker
```bash
# Build the Docker image
docker build -t analytical-mcp .

# Run with environment variables
docker run -d \
  --name analytical-mcp \
  -e EXA_API_KEY=your_api_key_here \
  -v $(pwd)/cache:/app/cache \
  analytical-mcp

# Or use docker-compose
cp .env.example .env
# Edit .env with your API key
docker-compose up -d
```

### Configuration

#### Direct Installation Configuration
1. Copy `.env.example` to `.env`
2. Add your EXA_API_KEY to `.env`
3. Add to Claude Desktop configuration:

```json
{
  "mcpServers": {
    "analytical": {
      "command": "node",
      "args": ["/path/to/analytical-mcp/build/index.js"],
      "env": {
        "EXA_API_KEY": "your-exa-api-key-here"
      }
    }
  }
}
```

#### Docker Configuration
1. Copy `.env.example` to `.env`
2. Add your EXA_API_KEY to `.env`
3. Add to Claude Desktop configuration:

```json
{
  "mcpServers": {
    "analytical": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "--env-file", ".env",
        "-v", "$(pwd)/cache:/app/cache",
        "analytical-mcp"
      ]
    }
  }
}
```

## 📚 Tool Categories & Examples

### 🔢 Statistical Analysis Tools

#### `analytical:analyze_dataset`
**Purpose**: Comprehensive statistical analysis of datasets

```json
{
  "data": [23, 45, 67, 34, 56, 78, 90, 12, 45, 67],
  "analysisType": "stats"
}
```
**Output**: Descriptive statistics, distribution analysis, data quality assessment

#### `analytical:advanced_regression_analysis`
**Purpose**: Advanced regression modeling with multiple types

```json
{
  "data": [
    {"sales": 1200, "advertising": 300, "price": 50},
    {"sales": 1500, "advertising": 400, "price": 45},
    {"sales": 1800, "advertising": 500, "price": 40}
  ],
  "regressionType": "multivariate",
  "independentVariables": ["advertising", "price"],
  "dependentVariable": "sales",
  "includeConfidenceIntervals": true
}
```
**Output**: Model coefficients, R-squared, residual analysis, feature importance

#### `analytical:hypothesis_testing`
**Purpose**: Statistical hypothesis testing with multiple test types

```json
{
  "testType": "t_test_independent",
  "data": [
    [23, 45, 67, 34, 56],
    [78, 90, 45, 67, 89]
  ],
  "alpha": 0.05,
  "alternativeHypothesis": "two-sided"
}
```
**Output**: Test statistics, p-values, confidence intervals, effect sizes

#### `analytical:data_visualization_generator`
**Purpose**: Generate comprehensive visualization specifications

```json
{
  "data": [
    {"month": "Jan", "sales": 1200, "region": "North"},
    {"month": "Feb", "sales": 1500, "region": "North"},
    {"month": "Jan", "sales": 1100, "region": "South"}
  ],
  "visualizationType": "bar",
  "variables": ["month", "sales"],
  "colorBy": "region",
  "title": "Monthly Sales by Region"
}
```
**Output**: Vega-Lite compatible specs, styling recommendations, interactive features

### 🎯 Decision Support Tools

#### `analytical:decision_analysis`
**Purpose**: Multi-criteria decision analysis with weighted scoring

```json
{
  "options": ["Cloud Solution", "On-Premise", "Hybrid Approach"],
  "criteria": ["Initial Cost", "Operating Cost", "Scalability", "Security", "Maintenance"],
  "weights": [0.2, 0.25, 0.2, 0.2, 0.15],
  "includeTradeoffs": true,
  "sensitivityAnalysis": true
}
```
**Output**: Ranked options, pros/cons analysis, risk assessment, sensitivity analysis

### 🧠 Logical Reasoning Tools

#### `analytical:logical_argument_analyzer`
**Purpose**: Comprehensive logical argument analysis

```json
{
  "argument": "If we invest in renewable energy, we will reduce carbon emissions. Reduced carbon emissions lead to a healthier environment. Therefore, investing in renewable energy leads to a healthier environment.",
  "analysisType": "comprehensive",
  "includeRecommendations": true,
  "detailLevel": "expert"
}
```
**Output**: Structure analysis, validity assessment, strength evaluation, improvement suggestions

#### `analytical:logical_fallacy_detector`
**Purpose**: Detect and explain logical fallacies with confidence scoring

```json
{
  "text": "You can't trust John's argument about climate change because he's not a climate scientist. Besides, if we take action on climate change, it will destroy the economy.",
  "confidenceThreshold": 0.7,
  "includeExplanations": true,
  "includeExamples": true
}
```
**Output**: Detected fallacies (ad hominem, false dilemma), explanations, reformulation suggestions

#### `analytical:perspective_shifter`
**Purpose**: Generate alternative perspectives and viewpoints

```json
{
  "problem": "Our company should implement a 4-day work week",
  "currentPerspective": "Management is concerned about productivity loss",
  "shiftType": "stakeholder",
  "numberOfPerspectives": 4,
  "includeActionable": true
}
```
**Output**: Employee, customer, investor, and competitor perspectives with actionable insights

### 🔍 Research Verification Tools

#### `analytical:verify_research`
**Purpose**: Cross-source research verification with confidence scoring

```json
{
  "query": "Remote work increases employee productivity by 13-20%",
  "sources": 5,
  "minConsistencyThreshold": 0.8,
  "includeSourceAnalysis": true,
  "factExtractionOptions": {
    "maxFacts": 15,
    "minConfidence": 0.8
  }
}
```
**Output**: Consistency scores, extracted facts, source credibility, conflicting information analysis

## 📋 Complete Tool Reference

| Tool | Category | Description | Key Features |
|------|----------|-------------|-------------|
| `analyze_dataset` | Statistical | Comprehensive dataset analysis | Descriptive stats, distribution analysis, data quality |
| `advanced_regression_analysis` | Statistical | Advanced regression modeling | Linear, polynomial, logistic, multivariate with diagnostics |
| `hypothesis_testing` | Statistical | Statistical hypothesis testing | t-tests, correlation, ANOVA with effect sizes |
| `data_visualization_generator` | Statistical | Visualization specifications | Multiple chart types, Vega-Lite compatible |
| `decision_analysis` | Decision Support | Multi-criteria decision analysis | Weighted scoring, sensitivity analysis, tradeoffs |
| `logical_argument_analyzer` | Logical Reasoning | Argument structure and validity | Premises/conclusions, validity, strength assessment |
| `logical_fallacy_detector` | Logical Reasoning | Fallacy detection with confidence | 20+ fallacy types, explanations, reformulation |
| `perspective_shifter` | Logical Reasoning | Alternative perspective generation | Stakeholder, contrarian, cross-disciplinary views |
| `verify_research` | Research | Cross-source research verification | Multi-source validation, fact extraction, consistency |

**📖 Complete API documentation**: [docs/API_REFERENCE.md](./docs/API_REFERENCE.md)

## 🎯 Real-World Use Cases

### 📈 Business Intelligence Workflow
```bash
# 1. Analyze sales data
analytical:analyze_dataset → 
# 2. Build predictive model
analytical:advanced_regression_analysis → 
# 3. Visualize results
analytical:data_visualization_generator
```

### 🤔 Strategic Decision Making
```bash
# 1. Research market conditions
analytical:verify_research → 
# 2. Generate alternative perspectives
analytical:perspective_shifter → 
# 3. Analyze decision options
analytical:decision_analysis
```

### 🧠 Critical Thinking & Analysis
```bash
# 1. Detect logical fallacies
analytical:logical_fallacy_detector → 
# 2. Analyze argument structure
analytical:logical_argument_analyzer → 
# 3. Generate counterarguments
analytical:perspective_shifter
```

### 🔬 Research & Validation
```bash
# 1. Cross-verify claims
analytical:verify_research → 
# 2. Test hypotheses
analytical:hypothesis_testing → 
# 3. Generate insights
analytical:perspective_shifter
```

## 🛠 Development

### Quick Development Commands
```bash
# Start development with auto-rebuild
npm run watch

# Run comprehensive tests
npm run test:coverage

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:research      # Research API tests

# Code quality checks
npm run lint              # ESLint check
npm run typecheck         # TypeScript check
npm run format:check      # Prettier check

# Debug and inspect
npm run inspector         # MCP protocol inspector
npm run test:debug        # Debug test execution
```

### 📝 Documentation Structure
```
docs/
├── API_REFERENCE.md      # Complete tool documentation
├── TESTING.md           # Testing strategies and patterns  
├── CI-CD.md             # GitHub Actions workflows
├── TROUBLESHOOTING.md   # Common issues and solutions
└── ARCHITECTURE.md      # System architecture

CONTRIBUTING.md          # Development guidelines (NEW!)
```

### 🏢 Project Architecture
```
analytical-mcp/
├── src/
│   ├── tools/              # 🧠 MCP tool implementations (9 registered)
│   │   ├── __tests__/      # ✅ Unit tests for each tool
│   │   └── index.ts        # Tool registration and MCP integration
│   ├── utils/              # 🛠 Utility functions and helpers
│   │   ├── __tests__/      # ✅ Utility function tests
│   │   └── logger.ts       # Centralized logging system
│   ├── integration/        # 🔗 Integration test suites
│   └── index.ts            # 🚀 Main MCP server entry point
├── docs/                   # 📚 Comprehensive documentation
├── examples/               # 💡 Real-world usage examples
├── tools/                  # 🔧 Development and testing scripts
└── .github/workflows/      # ⚙️ CI/CD automation
```

## 📋 Key Features

### 🎆 Enterprise-Ready
- **High Performance**: Optimized for datasets up to 100K records
- **Type Safety**: Full TypeScript with Zod schema validation
- **Error Handling**: Comprehensive error messages with resolution guidance
- **Logging**: Centralized logging system with MCP protocol compliance
- **Testing**: 80%+ test coverage with comprehensive test suites

### 🚀 Production Features
- **Caching**: Intelligent caching for research operations (24h default)
- **Rate Limiting**: Built-in API rate limiting with exponential backoff
- **Parallel Processing**: Concurrent processing for multi-source research
- **Memory Management**: Streaming processing for large datasets
- **Security**: Local processing, no persistent storage, API key protection

### 🤝 Integration Friendly
- **MCP Protocol**: Full compliance with Model Context Protocol v1.16.0+
- **Tool Chaining**: Tools designed to work together in workflows
- **Claude Desktop**: Seamless integration with Claude Desktop app
- **Docker Support**: Containerized deployment with docker-compose
- **CI/CD Ready**: GitHub Actions workflows for testing and deployment

## 🔒 Security & Privacy

### 🔐 Data Protection
- **🏠 Local Processing**: All statistical analysis performed locally
- **🗪 No Persistent Storage**: Data processed in memory, not stored permanently
- **🧙 Memory Cleanup**: Automatic cleanup of processed data after analysis
- **✨ Input Sanitization**: All inputs validated and sanitized before processing

### 🔑 API Security
- **🔐 Environment Variables**: Secure API key storage in .env files
- **🙈 No Logging**: API keys never logged or exposed in outputs
- **✅ Validation**: API key validity checked at server startup
- **🔄 Rotation Support**: Easy API key rotation without service restart

### 🌐 Research Privacy
- **🎭 Query Anonymization**: Research queries sanitized of sensitive information
- **📊 Source Diversity**: Multiple sources prevent single-point data dependency
- **🤝 Consent-Aware**: Respects robots.txt and API terms of service
- **📎 Data Minimization**: Only necessary data extracted and processed


## 🤝 Contributing

**New contributors can be up and running in ~10 minutes!** 🚀

### Quick Contribution Setup
```bash
# Fork and clone
git clone https://github.com/your-username/analytical-mcp.git
cd analytical-mcp

# Install and setup
npm install
cp .env.example .env
# Add your EXA_API_KEY to .env

# Build and test
npm run build
npm run test:quick

# Start developing
npm run watch
```

### 📄 Contribution Guidelines
- **📖 Read First**: [CONTRIBUTING.md](./CONTRIBUTING.md) - Comprehensive development guide
- **✅ Code Quality**: 80% test coverage required, ESLint + Prettier enforced
- **🔍 Testing**: All new tools must include comprehensive tests
- **📝 Documentation**: Update API docs for new tools and features
- **🔄 Process**: Fork → Feature Branch → Tests → PR → Review → Merge

### 🌟 Recognition
Contributors are recognized in:
- GitHub contributors list
- Release notes for significant contributions  
- Project README acknowledgments

## 🔧 Troubleshooting

### 🔍 Quick Diagnostics
```bash
# Health check
npm run build && npm run inspector

# Verify environment
node -e "console.log(process.env.EXA_API_KEY ? 'API key set' : 'API key missing')"

# Test tool registration
npm run test:server

# Check dependencies
npm audit
```

### 🐛 Common Issues & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **JSON parsing errors** | Server disabled in Claude Desktop | Ensure Logger class used (no console.log) |
| **Tools not appearing** | Tools missing from Claude | Check Claude Desktop config, restart app |
| **Research features disabled** | "Research integration disabled" | Add `EXA_API_KEY` to .env file |
| **Slow performance** | Tools timeout or slow | Enable caching: `ENABLE_RESEARCH_CACHE=true` |
| **Memory issues** | Out of memory errors | Use `--max-old-space-size=4096` flag |

**📖 Complete troubleshooting guide**: [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

## 🔗 Resources & Links

### 📚 Documentation
- **[API Reference](./docs/API_REFERENCE.md)** - Complete tool documentation with examples
- **[Contributing Guide](./CONTRIBUTING.md)** - Development setup and guidelines  
- **[Testing Guide](./docs/TESTING.md)** - Testing strategies and patterns
- **[CI/CD Guide](./docs/CI-CD.md)** - GitHub Actions workflows
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

### 🌐 External Resources
- **[Model Context Protocol](https://modelcontextprotocol.io/)** - MCP specification and docs
- **[Exa API](https://docs.exa.ai/)** - Research API documentation
- **[Claude Desktop](https://claude.ai/desktop)** - Claude Desktop application
- **[TypeScript](https://www.typescriptlang.org/)** - TypeScript documentation
- **[Jest Testing](https://jestjs.io/)** - Testing framework documentation

---

**Made with ❤️ for enhanced AI analytical capabilities**

Built with TypeScript, tested with Jest, powered by MCP • [MIT License](./LICENSE)
