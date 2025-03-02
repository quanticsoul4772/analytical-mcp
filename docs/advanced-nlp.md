# Advanced NLP Capabilities

This document provides an overview of the advanced natural language processing (NLP) capabilities in the Analytical MCP Server.

## Overview

The Analytical MCP Server includes sophisticated NLP capabilities that enhance AI models with structured language understanding:

1. **Named Entity Recognition (NER)**: Identify and classify entities in text
2. **Coreference Resolution**: Resolve pronouns and references to their antecedents
3. **Relationship Extraction**: Identify relationships between entities
4. **Enhanced Fact Extraction**: Extract high-quality facts from text

## Named Entity Recognition

### Implementation

Named Entity Recognition is implemented with a multi-tiered approach:

1. **Exa-Based NER** (Primary method)
   - Uses Exa research integration to analyze text
   - Provides context-aware entity recognition
   - Leverages search capabilities for better understanding

2. **Natural.js NER** (First fallback)
   - Uses the natural.js library's built-in NER capabilities
   - Provides basic entity recognition for common entity types

3. **Rule-Based NER** (Final fallback)
   - Uses pattern matching and linguistic rules
   - Recognizes dates, money amounts, percentages, etc.
   - Provides reliable extraction even without external APIs

### Entity Types

The system recognizes the following entity types:

- **PERSON**: People's names (e.g., "John Smith")
- **ORGANIZATION**: Company, institution names (e.g., "Apple Inc.")
- **LOCATION**: Place names (e.g., "New York City")
- **DATE**: Date expressions (e.g., "January 15, 2023")
- **TIME**: Time expressions (e.g., "3:30 PM")
- **MONEY**: Monetary values (e.g., "$1,000")
- **PERCENT**: Percentage values (e.g., "25%")
- **FACILITY**: Building or infrastructure (e.g., "Empire State Building")
- **PRODUCT**: Product names (e.g., "iPhone 14")
- **EVENT**: Event names (e.g., "World Cup 2022")
- **LAW**: Legal references (e.g., "First Amendment")
- **LANGUAGE**: Language names (e.g., "Spanish")
- **WORK_OF_ART**: Creative works (e.g., "Mona Lisa")

## Coreference Resolution

The Coreference Resolution system links mentions of the same entity in text:

- Identifies mentions (pronouns, names, noun phrases)
- Groups mentions into coreference chains
- Handles various types of references (anaphora, cataphora)
- Provides resolved text with references replaced

## Relationship Extraction

The Relationship Extraction system identifies semantic relationships between entities:

- Extracts binary relationships (subject-verb-object)
- Identifies relationship types (family, employment, location, etc.)
- Calculates confidence scores for extracted relationships
- Provides evidence for the extracted relationships

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_ADVANCED_NLP` | Enable advanced NLP features | `true` |
| `NLP_USE_EXA` | Use Exa for named entity recognition | `true` |
| `NLP_EXA_NUM_RESULTS` | Number of search results to use | `3` |
| `NLP_EXA_USE_WEB` | Use web results for entity recognition | `true` |
| `NLP_EXA_USE_NEWS` | Use news results for entity recognition | `false` |
| `NLP_COREFERENCE_ENABLED` | Enable coreference resolution | `true` |
| `NLP_RELATIONSHIP_ENABLED` | Enable relationship extraction | `true` |

### Required API Keys

The advanced NLP capabilities leverage the Exa API for enhanced results:

- `EXA_API_KEY`: Required for research integration and advanced NLP features

Set this key in your system environment variables.

## Example Usage

### Named Entity Recognition

```javascript
import { advancedNER } from './utils/advanced_ner.js';

const text = "Apple Inc. is planning to open a new headquarters in Austin, Texas. Tim Cook, the CEO of Apple, announced this decision last week.";

const entities = await advancedNER.recognizeEntities(text);
console.log(entities);
```

### Fact Extraction

```javascript
import { enhancedFactExtractor } from './utils/enhanced_fact_extraction.js';

const text = "The latest climate report shows global temperatures increased by 1.5°C since pre-industrial times.";

const result = await enhancedFactExtractor.extractFacts(text, {
  enableCoreference: true,
  enableRelationships: true
});
console.log(result.facts);
```

## Demo

Run the included demo to see the advanced NLP capabilities in action:

```bash
npm run build
node examples/advanced_nlp_demo.js
```

This will demonstrate:
- Named entity recognition
- Enhanced fact extraction
- Relationship extraction (when applicable)

## Performance Considerations

1. **API Usage**: Advanced NLP features use the Exa API, which may have rate limits. Enable caching to reduce API calls.

2. **Fallback Mechanisms**: The system gracefully degrades to local processing when APIs are unavailable.

3. **Caching**: Enable caching to improve performance and reduce API usage:
   ```
   ENABLE_RESEARCH_CACHE=true
   ```

4. **Text Length**: Processing very long texts may require more time and resources.
