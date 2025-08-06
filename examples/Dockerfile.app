# Multi-stage build for Node.js application with telemetry
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig*.json ./

# Copy the entire monorepo structure for dependencies
COPY ../packages ./packages

# Install dependencies including local packages
RUN npm ci

# Copy source code and configuration files
COPY . .

# Build all packages first, then the application
RUN npm run build:packages && npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Copy built application and built dependencies (dist output)
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist
COPY --from=builder --chown=nodeuser:nodejs /app/packages/*/dist ./packages/
COPY --from=builder --chown=nodeuser:nodejs /app/package*.json ./

# Copy the example applications
COPY --from=builder --chown=nodeuser:nodejs /app/*.js ./
COPY --from=builder --chown=nodeuser:nodejs /app/otel-config.js ./
COPY --from=builder --chown=nodeuser:nodejs /app/telemetry-enhanced-app.js ./

# Copy the entrypoint script
COPY --chown=nodeuser:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create logs directory
RUN mkdir -p /app/logs && chown nodeuser:nodejs /app/logs

# Environment variables for OpenTelemetry
ENV NODE_ENV=production
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
ENV OTEL_SERVICE_NAME=fastify-telemetry-example
ENV OTEL_SERVICE_VERSION=1.0.0
ENV PROMETHEUS_METRICS_PORT=9464
ENV ENABLE_TELEMETRY=true

# Application selection (which app to run)
ENV APP_MODE=enhanced
# Options: 
# - "enhanced" = telemetry-enhanced-app.js (full telemetry)
# - "unified" = fastify-with-telemetry-example.js (unified packages)  
# - "simple" = simplified-fastify-example.js (mock telemetry)

# Expose application and metrics ports
EXPOSE 3001 9464

# Switch to non-root user
USER nodeuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })" || exit 1

# Use custom entrypoint script instead of dumb-init directly
ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint.sh"]

# Default command (can be overridden)
CMD []
