# Multi-stage build for Node.js application with telemetry
# Using Node.js 22 LTS (latest LTS with modern features)
# NOTE: This assumes packages are pre-built and available in ../dist/packages/
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY examples/package*.json ./
COPY examples/tsconfig*.json ./

# Copy pre-built packages from mono-repo to the parent directory (../dist/packages)
# This matches the relative paths in package.json dependencies
COPY dist/packages/ ../dist/packages/

# Switch back to app directory
WORKDIR /app

# Install dependencies including local packages and their peer dependencies
RUN npm ci --legacy-peer-deps

# Create node_modules structure in /dist/packages so @inh-lib packages can find dependencies
# Each package needs to find both external dependencies (like tslib) and other @inh-lib packages
RUN mkdir -p /dist/packages/node_modules/@inh-lib && \
    # Link essential dependencies from /app/node_modules to /dist/packages/node_modules
    ln -sf /app/node_modules/tslib /dist/packages/node_modules/tslib && \
    # Link OpenTelemetry packages that @inh-lib packages need
    mkdir -p "/dist/packages/node_modules/@opentelemetry" && \
    for otel_pkg in api sdk-node sdk-trace-node auto-instrumentations-node instrumentation-http \
                    instrumentation-fs instrumentation-fastify semantic-conventions \
                    auto-instrumentations-web resources; do \
        if [ -d "/app/node_modules/@opentelemetry/$otel_pkg" ]; then \
            ln -sf "/app/node_modules/@opentelemetry/$otel_pkg" "/dist/packages/node_modules/@opentelemetry/$otel_pkg"; \
        fi; \
    done && \
    # Link other common dependencies that @inh-lib packages might need
    for dep in reflect-metadata; do \
        if [ -d "/app/node_modules/$dep" ]; then \
            ln -sf "/app/node_modules/$dep" "/dist/packages/node_modules/$dep"; \
        fi; \
    done && \
    # Create @inh-lib namespace and link all our packages
    for pkg_dir in /dist/packages/*/; do \
        if [ -d "$pkg_dir" ] && [ -f "$pkg_dir/package.json" ]; then \
            pkg_name=$(basename "$pkg_dir"); \
            ln -sf "$pkg_dir" "/dist/packages/node_modules/@inh-lib/$pkg_name"; \
        fi; \
    done

# Copy source code and configuration files
COPY examples/ ./

# Build the example application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Copy built application and built dependencies (dist output)
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist
COPY --from=builder --chown=nodeuser:nodejs /dist/packages ../dist/packages/
COPY --from=builder --chown=nodeuser:nodejs /app/package*.json ./

# Copy the example applications
COPY --from=builder --chown=nodeuser:nodejs /app/dist/*.js ./
COPY --from=builder --chown=nodeuser:nodejs /app/dist/otel-config.js ./
COPY --from=builder --chown=nodeuser:nodejs /app/dist/telemetry-enhanced-app.js ./

# Copy the entrypoint script and create logs directory
COPY --from=builder --chown=nodeuser:nodejs /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && \
    mkdir -p /app/logs && \
    chown nodeuser:nodejs /app/logs

# Environment variables for OpenTelemetry
ENV NODE_ENV=production
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
ENV OTEL_SERVICE_NAME=fastify-telemetry-example
ENV OTEL_SERVICE_VERSION=1.0.0
ENV PROMETHEUS_METRICS_PORT=9464
ENV ENABLE_TELEMETRY=true

# Application selection (which app to run)
ENV APP_MODE=unified
# Options: 
# - "unified" = fastify-with-telemetry-example.js (unified packages - DEFAULT)
# - "enhanced" = telemetry-enhanced-app.js (advanced telemetry features)
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
