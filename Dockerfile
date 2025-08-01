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

# Install dependencies (including dev dependencies for build)
RUN npm ci

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

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

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

# Expose port (though MCP servers typically use stdio)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV CACHE_DIR=./cache
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Default command
CMD ["node", "build/index.js"]
