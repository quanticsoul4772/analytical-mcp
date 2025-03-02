# Caching System

The Analytical MCP Server includes a robust caching system that significantly improves performance, reduces API calls, and enhances reliability. This document explains how the caching system works and how to configure it for your needs.

## Overview

The caching system provides:

1. **Performance Optimization**: Dramatically reduces response times for repeated operations
2. **API Usage Efficiency**: Minimizes external API calls, reducing costs and rate limit issues
3. **Reliability**: Provides resilience against API outages and intermittent failures
4. **Consistency**: Ensures consistent results for identical queries

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Research Tools ├────►│ Research Cache  ├────►│  Cache Manager  │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │                 │
                                               │  Disk Storage   │
                                               │                 │
                                               └─────────────────┘
```

The caching system consists of three main components:

1. **Cache Manager** (`cache_manager.ts`): A generic caching utility that handles:
   - In-memory caching with TTL (Time To Live)
   - Persistent caching to disk
   - Cache statistics tracking
   - Automatic cleanup of expired entries

2. **Research Cache** (`research_cache.ts`): A domain-specific cache for research operations:
   - Web search results caching
   - Fact extraction caching
   - Data validation caching
   - Cross-domain research caching

3. **Tool Integration**: The research tools have been updated to use the caching system:
   - `exa_research.ts` uses caching for search, fact extraction, and validation
   - `research_integration.ts` uses caching for enrichment and cross-domain research

## Configuration

The caching system is highly configurable through environment variables:

### Enabling/Disabling Caching

```
# Enable or disable the research cache globally
ENABLE_RESEARCH_CACHE=true
```

### Cache Storage Configuration

```
# Enable or disable persistent caching to disk
CACHE_PERSISTENT=true

# Directory for persistent cache files
CACHE_DIR=./cache

# Default cache TTL in milliseconds (24 hours)
CACHE_DEFAULT_TTL=86400000

# Cleanup interval in milliseconds (1 hour)
CACHE_CLEANUP_INTERVAL=3600000
```

### Operation-Specific Cache TTLs

```
# Search results TTL (1 hour)
CACHE_TTL_SEARCH=3600000

# Extracted facts TTL (24 hours)
CACHE_TTL_FACTS=86400000

# Validation results TTL (12 hours)
CACHE_TTL_VALIDATION=43200000

# Cross-domain research TTL (7 days)
CACHE_TTL_CROSS_DOMAIN=604800000
```

## Usage in Code

### Using Research Cache Directly

```typescript
import { researchCache } from './utils/research_cache.js';

// Check if search results are cached
const cachedResults = researchCache.getSearchResults(query, options);
if (cachedResults) {
  return cachedResults;
}

// Perform search and cache results
const results = await performSearch(query, options);
researchCache.setSearchResults(query, options, results);
```

### Using Cache-Aware Tools

The research tools automatically handle caching, but you can control it with options:

```typescript
// Use cached results if available (default)
const results = await researchIntegration.enrichAnalyticalContext(
  data,
  context,
  { skipCache: false }
);

// Force fresh results
const freshResults = await researchIntegration.enrichAnalyticalContext(
  data,
  context,
  { skipCache: true }
);

// Check if results came from cache
if (results.cacheHit) {
  console.log("Results were cached");
}
```

## Cache Namespaces

The caching system uses namespaces to organize different types of cached data:

```typescript
export enum ResearchCacheNamespace {
  SEARCH = 'research:search',
  FACTS = 'research:facts',
  VALIDATION = 'research:validation',
  CROSS_DOMAIN = 'research:cross_domain',
  ENRICHMENT = 'research:enrichment'
}
```

Each namespace has its own configuration and can be managed independently.

## Performance Impact

The performance impact of caching is significant:

- **Search Operations**: Typically 95-99% faster with caching
- **Fact Extraction**: Typically 80-95% faster with caching
- **Cross-Domain Research**: Can be up to 99% faster with caching
- **Data Validation**: Typically 90-98% faster with caching

For a practical demonstration, run the cache performance demo:

```
node examples/cache_performance_demo.js
```

## Cache Maintenance

The cache system performs automatic maintenance:

1. **Expiration**: Entries automatically expire based on their TTL
2. **Cleanup**: Periodic cleanup removes expired entries
3. **Preloading**: On startup, the system preloads cached entries from disk

However, you might want to manually manage the cache in some situations:

```typescript
// Clear specific namespace
researchCache.clear(ResearchCacheNamespace.SEARCH);

// Clear all research caches
researchCache.clearAll();

// Get cache statistics
const stats = researchCache.getStats();
```

## Best Practices

1. **TTL Selection**:
   - Use shorter TTLs for rapidly changing data (search results, news)
   - Use longer TTLs for stable knowledge (facts, domain knowledge)

2. **Cache Invalidation**:
   - Use `skipCache: true` when fresh data is critical
   - Consider clearing caches when underlying data sources change

3. **Monitoring**:
   - Monitor cache hit/miss ratios to optimize TTLs
   - Watch disk usage if persistent caching is enabled with large datasets

4. **Testing**:
   - Disable caching during tests that rely on deterministic API results
   - Add tests specifically for cache functionality

## Troubleshooting

### Common Issues

1. **Cache Not Working**:
   - Check if `ENABLE_RESEARCH_CACHE=true` is set
   - Verify the cache directory is writable if using persistent caching

2. **Stale Data**:
   - Use `skipCache: true` to force fresh data
   - Adjust TTLs in environment variables if data becomes stale too quickly

3. **Disk Space Issues**:
   - Reduce TTLs to expire data faster
   - Set `CACHE_PERSISTENT=false` to disable disk caching
   - Manually clear the cache directory

### Debugging

The cache system logs detailed information:

- Cache initialization
- Cache hits and misses
- Cleanup operations
- Preloading statistics

Enable DEBUG log level to see detailed cache operations:

```
LOG_LEVEL=DEBUG
```
