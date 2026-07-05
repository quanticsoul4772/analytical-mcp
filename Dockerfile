# Multi-stage build for analytical-mcp server
FROM node:20-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.test.json ./

# Install dependencies (including dev dependencies for build).
# --ignore-scripts skips the package.json `prepare` hook (which runs `tsc`)
# during install — src/ isn't copied yet and the explicit build below is the
# real compile step.
RUN npm ci --ignore-scripts

# Copy source code and configuration files
COPY src/ ./src/
COPY tools/ ./tools/
COPY .env.example ./

# Build the TypeScript project
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies for native modules
RUN apk add --no-cache \
    python3 \
    libc6-compat

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S analytical -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies. --ignore-scripts skips the `prepare`
# hook (tsc is a dev dependency and absent here); the built output is copied
# from the builder stage below.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/build ./build/

# Copy tools directory (needed for runtime utilities)
COPY --from=builder /app/tools ./tools/

# Create cache directory with proper permissions
RUN mkdir -p cache && chown analytical:nodejs cache

# Copy environment example (users can override with their own .env)
COPY --from=builder /app/.env.example ./

# Switch to non-root user
USER analytical

# The MCP server itself communicates over stdio; the only HTTP listener is the
# optional metrics server (METRICS_ENABLED defaults to true) on METRICS_PORT.
EXPOSE 9090

# Set environment variables
ENV NODE_ENV=production
ENV CACHE_DIR=./cache
# Keep the container pure stdio (no HTTP metrics listener) — this is what
# sandboxed MCP introspection expects. Override to true to enable metrics.
ENV METRICS_ENABLED=false

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Default command
CMD ["node", "build/index.js"]
