# Multi-stage Docker build for MCP Bridge Service

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Stage 2: Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp-bridge -u 1001

# Set working directory
WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder --chown=mcp-bridge:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=mcp-bridge:nodejs src/ ./src/
COPY --chown=mcp-bridge:nodejs package*.json ./

# Create logs directory
RUN mkdir -p logs && chown mcp-bridge:nodejs logs

# Switch to app user
USER mcp-bridge

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]