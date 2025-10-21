# Analytical MCP Server Architecture

## System Overview
The Analytical MCP Server implements the Model Context Protocol (MCP) to provide statistical analysis, decision support, logical reasoning, and research verification capabilities. The system follows a modular, layered architecture with strict type safety and comprehensive error handling.

## Architectural Layers

### 1. Protocol Layer
- MCP Server (stdio transport)
- Tool registration and routing
- Request/response handling
- Error transformation and formatting

### 2. Tool Layer
Nine core MCP tools exposed to clients:
- Statistical analysis tools (analyze_dataset, advanced_regression_analysis, hypothesis_testing)
- Visualization tool (data_visualization_generator)
- Decision support tool (decision_analysis)
- Logical reasoning tools (logical_argument_analyzer, logical_fallacy_detector, perspective_shifter)
- Research verification tool (verify_research)

### 3. Service Layer
Internal service modules providing specialized functionality:
- Argument analysis (structure, validity, strength)
- Statistical computation (advanced methods, data preprocessing)
- NLP processing (entity extraction, text analysis)
- Research integration (Exa API, fact extraction, verification)
- Data management and validation

### 4. Infrastructure Layer
Cross-cutting concerns and utilities:
- Caching system (persistent file-based cache with TTL)
- Logging system (centralized Logger with MCP compliance)
- Error handling (circuit breaker, retry logic, error wrapper)
- Performance monitoring (execution tracking, memory monitoring)
- Configuration management (environment-based feature flags)
- API resilience (rate limiting, exponential backoff)
- Metrics collection (Prometheus-compatible endpoint)

## Detailed Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Legend: ┌─┐ = Module/Layer, ▼ = Data flow, │ = Separation        │
├─────────────────────────────────────────────────────────────────┤
│                     MCP Protocol Layer                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  McpServer (stdio transport)                              │  │
│  │  - Tool routing and validation                            │  │
│  │  - Request/response serialization                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                        Tool Layer (9 tools)                      │
├──────────────────────────────────────────────────────────────────┤
│  Statistical Tools              Logical Reasoning Tools          │
│  - analyze_dataset              - logical_argument_analyzer      │
│  - advanced_regression          - logical_fallacy_detector       │
│  - hypothesis_testing           - perspective_shifter            │
│  - data_visualization_generator                                  │
│                                 Decision Support                 │
│  Research Verification          - decision_analysis              │
│  - verify_research                                               │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                        Service Layer                             │
├──────────────────────────────────────────────────────────────────┤
│  Argument Analysis          Statistical Services                 │
│  - Structure provider       - Advanced analysis                  │
│  - Validity provider        - Data preprocessing                 │
│  - Strength provider        - ML model evaluation                │
│  - Fallacy provider                                              │
│                             Research Services                    │
│  NLP Services               - Exa API integration                │
│  - NLP toolkit              - Fact extraction                    │
│  - Entity extraction        - Multi-source verification          │
│  - Text processing          - Confidence scoring                 │
│  - Sentiment analysis                                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    Infrastructure Layer                          │
├──────────────────────────────────────────────────────────────────┤
│  Caching             Error Handling        Observability         │
│  - cache_manager     - error_wrapper       - Logger              │
│  - enhanced_cache    - circuit breaker     - metrics_server      │
│  - research_cache    - retry logic         - metrics_collector   │
│                      - api_resilience      - performance_monitor │
│                                                                   │
│  Configuration       Validation            Data Management       │
│  - config           - validation_helpers   - secure_file_parser  │
│  - feature flags    - zod schemas          - rate_limit_manager  │
└──────────────────────────────────────────────────────────────────┘
```

## Core Components

### Tool Registration System
Location: `src/tools/index.ts`

The tool registration system uses the MCP SDK to expose nine tools to Claude. Each tool includes:
- Zod schema for input validation
- Async handler function with error handling
- Type-safe parameter interfaces
- Consistent JSON response formatting

### Caching Architecture
The system implements three specialized cache layers:

1. Base Cache (cache_manager.ts, 638 lines)
   - File-based persistent storage
   - Namespace isolation
   - TTL management
   - Statistics tracking
   - Async I/O operations

2. Enhanced Cache (enhanced_cache.ts, 604 lines)
   - Semantic caching with similarity matching
   - Priority-based eviction
   - Tag-based organization
   - Advanced query capabilities

3. Research Cache (research_cache.ts, 473 lines)
   - Specialized for research operations
   - Query deduplication
   - Source-aware caching
   - Integration with cache_manager

### Error Handling System
Location: `src/utils/error_wrapper.ts` (399 lines)

Provides enterprise-grade error handling patterns:
- Retry logic with exponential backoff
- Circuit breaker pattern (CLOSED, OPEN, HALF_OPEN states)
- Timeout protection
- Fallback strategies
- Batch operation error isolation
- Async memoization with TTL

### Performance Monitoring
Location: `src/utils/performance_monitor.ts` (398 lines)

Comprehensive performance tracking:
- Execution time measurement (sync and async)
- Memory usage monitoring
- Statistical analysis (min, max, mean, median, p95, p99)
- Memory leak detection
- Slow operation detection
- Decorator support for automatic timing

### Logging System
Location: `src/utils/logger.ts`

MCP-compliant logging implementation:
- All logs to stderr (stdout reserved for protocol)
- Singleton pattern for consistency
- Multiple log levels (debug, info, warn, error)
- Environment-aware configuration
- Integration with utility scripts

### Observability
Location: `src/utils/metrics_server.ts`, `src/utils/metrics_collector.ts`

Metrics endpoint on port 9090:
- Circuit breaker metrics (state, calls, failures)
- Cache metrics (hits, misses, size, evictions)
- System metrics (uptime, memory, CPU)
- Health check endpoint
- Prometheus-compatible format
- JSON format support

### API Resilience
Location: `src/utils/api_resilience.ts`

Handles external API interactions:
- Circuit breaker for failure protection
- Exponential backoff with jitter
- Configurable retry policies
- Request deduplication
- Rate limiting integration

## Technology Stack

### Core Technologies
- TypeScript 5.9.3 (strict type safety, ES modules)
- Node.js 20+ (JavaScript runtime)
- MCP SDK 1.16.0 (Model Context Protocol)
- Zod 3.24.2 (schema validation and type inference)

### Mathematical and Statistical Libraries
- mathjs 14.3.0 (mathematical computations)
- natural 6.9.0 (NLP tokenization and stemming)
- sentiment 5.0.2 (sentiment analysis)

### NLP Libraries
- wink-nlp 2.4.0 (NLP toolkit for tokenization, POS tagging, and lemmatization)
- compromise 14.12.0 (natural language processing and entity extraction)
- sentiment 5.0.2 (sentiment analysis)
- spellchecker 3.7.1 (spell checking)

### Data Processing
- papaparse 5.4.1 (CSV parsing)
- node-fetch 3.3.2 (HTTP requests)

### Testing and Development
- Jest 29.7.0 (test framework)
- ts-jest 29.4.4 (TypeScript support)
- ESLint and Prettier (code quality)
- nock 13.5.1 (HTTP mocking)

## Design Principles

### Modularity
- Clear separation between tools, services, and infrastructure
- Single responsibility for each module
- Reusable service layer components
- Pluggable architecture for new tools

### Type Safety
- TypeScript with strict typing enabled
- Zod schemas for runtime validation
- Explicit function return types
- Type inference from schemas

### Error Handling
- Consistent error codes (ERR_1001 through ERR_5003)
- Structured error objects with context
- Automatic retry for recoverable errors
- Circuit breaker for cascading failure prevention
- Graceful degradation

### Centralized Logging
- No direct console usage in production code
- MCP protocol compliance (stderr only)
- Consistent log formatting
- Environment-aware log levels
- Integration with utility scripts

### Performance
- Non-blocking async I/O
- Persistent caching with TTL
- Lazy loading of heavy libraries
- Performance monitoring built-in
- Memory leak detection

### Observability
- Metrics endpoint for monitoring
- Health check endpoint
- Performance statistics
- Cache hit/miss tracking
- Circuit breaker state monitoring

## Configuration Management

The system uses environment-based configuration with feature flags:

Development Environment:
- All features enabled
- Debug logging
- No caching persistence
- Metrics enabled

Test Environment:
- Research features disabled
- Caching disabled
- Mock API responses
- Reduced timeouts

Production Environment:
- Selective feature enabling
- Info-level logging
- Persistent caching
- Metrics enabled
- API key validation

Configuration file: `src/utils/config.ts`
Environment file: `.env` (from `.env.example`)

## Data Flow

1. Client sends MCP request via stdio
2. MCP Server validates request and routes to tool
3. Tool validates parameters using Zod schema
4. Tool calls service layer functions
5. Services use infrastructure layer (cache, logging, etc.)
6. External APIs called through resilience layer
7. Results formatted and returned to client
8. Metrics collected throughout execution

## Security Considerations

- Local processing (no external data storage)
- API key management via environment variables
- Input validation at tool boundary
- Secure file parsing for user-provided data
- No sensitive data in logs
- Optional research features (disabled by default in production)

## Extensibility

### Adding New Tools
1. Create tool implementation in `src/tools/`
2. Define Zod schema for parameters
3. Register tool in `src/tools/index.ts`
4. Add tests in `src/tools/__tests__/`
5. Update API documentation

### Adding New Services
1. Create service module in `src/utils/`
2. Implement functionality with error handling
3. Add caching if appropriate
4. Include performance monitoring
5. Write unit tests
6. Update architecture documentation

### Integrating External APIs
1. Add API client in `src/utils/`
2. Implement circuit breaker and retry logic
3. Add rate limiting
4. Create mock for testing
5. Document API requirements

## Performance Characteristics

### Caching Impact
- Cache hit: ~1-5ms response time
- Cache miss: Varies by operation (10ms-5s)
- Persistent cache load: Async, non-blocking

### Statistical Operations
- Small datasets (<1000 items): <50ms
- Large datasets (1000-10000 items): 50-500ms
- Very large datasets (>10000 items): 500ms-5s

### NLP Operations
- Text tokenization: ~10ms per 1000 words
- Entity extraction: ~50ms per 1000 words
- Sentiment analysis: ~5ms per 1000 words

### Research Operations
- Single source query: 200-1000ms
- Multi-source verification: 500-3000ms
- With caching: 1-10ms

## Testing Strategy

### Unit Tests
- Individual tool functionality
- Service layer logic
- Infrastructure utilities
- Mock external dependencies
- Target: 90%+ coverage

### Integration Tests
- End-to-end tool execution
- API integration
- Cache persistence
- Error handling flows
- Performance benchmarks

### Test Organization
- Unit tests: `src/**/__tests__/*.test.ts`
- Integration tests: `src/integration/*.test.ts`
- Separate Jest projects for parallel execution
- Mock API keys for testing without external dependencies

## Deployment Options

### Direct Node Execution
```bash
node build/index.js
```
Requires: Node.js 20+, EXA_API_KEY environment variable

### Claude Desktop Integration
Via configuration in `claude_desktop_config.json`

### Docker Container
Multi-stage build with Alpine Linux base image

### Docker Compose
Pre-configured environment with volume mounts for cache persistence

## Future Enhancements

### Short Term
- Cache system consolidation (reduce from 3 to 1-2 implementations)
- Dynamic tool discovery (reduce registration boilerplate)
- Enhanced metrics visualization
- Performance baseline establishment

### Medium Term
- Machine learning model integration
- Advanced time series analysis
- Multilingual NLP support
- Streaming results for large datasets

### Long Term
- Distributed caching
- Horizontal scaling support
- Plugin architecture for third-party tools
- Advanced visualization generation
