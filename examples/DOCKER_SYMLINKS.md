# Docker Symlinks Setup for Monorepo Packages

## Overview

This document explains why and how symlinks are created in the Docker container to enable proper module resolution for @inh-lib packages in a monorepo setup.

## Problem Statement

In a monorepo setup where packages are pre-built and copied to `/dist/packages`, the Node.js module resolution algorithm cannot find dependencies because:

1. **Pre-built packages** in `/dist/packages` don't have their own `node_modules`
2. **Dependencies** are installed in `/app/node_modules` (for the main application)
3. **@inh-lib packages** need to find both external dependencies (like `tslib`) and other @inh-lib packages

## Container Structure

```
📁 / (Container Root)
├── 📁 app/                           # Main application directory
│   ├── 📄 package.json               # Contains tslib, @opentelemetry/* dependencies
│   ├── 📁 node_modules/               # All dependencies installed here
│   │   ├── 📁 tslib/                  # ✅ External dependencies
│   │   ├── 📁 @opentelemetry/         # ✅ OpenTelemetry packages
│   │   ├── 📁 fastify/
│   │   └── 📁 ... (other dependencies)
│   └── 📄 fastify-with-telemetry-example.js
│
└── 📁 dist/                           # Monorepo packages
    └── 📁 packages/                   # Pre-built packages (NO node_modules)
        ├── 📁 unified-telemetry-core/
        │   └── 📁 src/
        │       └── 📄 index.js        # require("tslib") ← Can't find tslib!
        ├── 📁 unified-telemetry-middleware/
        ├── 📁 unified-route/
        └── 📁 node_modules/           # 🔗 Created by Dockerfile symlinks
            ├── 🔗 tslib → /app/node_modules/tslib
            ├── 📁 @inh-lib/
            │   ├── 🔗 unified-telemetry-core → /dist/packages/unified-telemetry-core/
            │   └── 🔗 ... (other @inh-lib packages)
            └── 📁 @opentelemetry/
                ├── 🔗 api → /app/node_modules/@opentelemetry/api
                └── 🔗 ... (other OpenTelemetry packages)
```

## Node.js Module Resolution

When code in `/dist/packages/unified-telemetry-core/src/index.js` calls:

```javascript
const tslib_1 = require("tslib");
```

Node.js searches in this order:

1. `/dist/packages/unified-telemetry-core/node_modules/tslib` ❌ (doesn't exist)
2. `/dist/packages/node_modules/tslib` ✅ (symlink points to `/app/node_modules/tslib`)
3. `/dist/node_modules/tslib` ❌ (doesn't exist)
4. `/node_modules/tslib` ❌ (doesn't exist)

## Symlink Creation Process

The Dockerfile creates symlinks in the builder stage:

```dockerfile
# Create node_modules structure in /dist/packages so @inh-lib packages can find dependencies
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
```

## Types of Symlinks Created

### 1. External Dependencies
```bash
/dist/packages/node_modules/tslib → /app/node_modules/tslib
/dist/packages/node_modules/reflect-metadata → /app/node_modules/reflect-metadata
```

### 2. OpenTelemetry Packages
```bash
/dist/packages/node_modules/@opentelemetry/api → /app/node_modules/@opentelemetry/api
/dist/packages/node_modules/@opentelemetry/sdk-node → /app/node_modules/@opentelemetry/sdk-node
# ... (other OpenTelemetry packages)
```

### 3. @inh-lib Cross-Package References
```bash
/dist/packages/node_modules/@inh-lib/unified-telemetry-core → /dist/packages/unified-telemetry-core/
/dist/packages/node_modules/@inh-lib/unified-route → /dist/packages/unified-route/
# ... (all @inh-lib packages)
```

## Why Not Just Copy Dependencies?

### Copying vs Symlinks

❌ **Copying approach:**
```dockerfile
COPY /app/node_modules /dist/packages/node_modules
```
- **Problems:**
  - Doubles the image size
  - Version conflicts if dependencies differ
  - Maintenance overhead

✅ **Symlink approach:**
```dockerfile
ln -sf /app/node_modules/tslib /dist/packages/node_modules/tslib
```
- **Benefits:**
  - Single source of truth for dependencies
  - Smaller image size
  - No version conflicts
  - Efficient disk usage

## Verification

You can verify the symlinks work by testing module resolution:

```bash
# Enter the container
docker exec -it <container-id> sh

# Test tslib resolution from a package directory
cd /dist/packages/unified-telemetry-core
echo 'console.log(require.resolve("tslib"))' | node
# Output: /app/node_modules/tslib/tslib.js

# Test @inh-lib package resolution
cd /dist/packages/unified-telemetry-middleware  
echo 'console.log(require.resolve("@inh-lib/unified-route"))' | node
# Output: /dist/packages/unified-route/src/index.js
```

## Common Issues and Solutions

### 1. Missing Symlinks
**Error:** `Cannot find module 'tslib'`
**Solution:** Ensure the symlink creation script runs successfully in the Dockerfile

### 2. Broken Symlinks
**Error:** `Module not found` even with symlinks
**Solution:** Check that source paths exist before creating symlinks:
```bash
if [ -d "/app/node_modules/$dep" ]; then
    ln -sf "/app/node_modules/$dep" "/dist/packages/node_modules/$dep"
fi
```

### 3. Absolute vs Relative Paths
**Issue:** Using relative paths in loops
**Solution:** Always use absolute paths in symlink creation:
```bash
# ❌ Wrong (relative path in loop)
cd /dist/packages && ln -sf "$pkg" "/dist/packages/node_modules/@inh-lib/$pkg_name"

# ✅ Correct (absolute path)
ln -sf "/dist/packages/$pkg_dir" "/dist/packages/node_modules/@inh-lib/$pkg_name"
```

## Build and Test

### Building the Image
```bash
# Build with symlinks
docker build -t app-unified:latest -f examples/Dockerfile.app .
```

### Testing Dependencies
```bash
# Run the container
docker run --rm -p 3001:3000 app-unified:latest

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/users
```

## Performance Impact

The symlink approach has minimal performance impact:
- **Creation time:** ~100ms during build
- **Runtime overhead:** None (symlinks are transparent to Node.js)
- **Disk usage:** Saves ~50-100MB compared to copying dependencies

## Future Improvements

1. **Dynamic symlink detection:** Automatically detect required dependencies from package.json
2. **Selective linking:** Only link dependencies that are actually used
3. **Validation:** Add verification step to ensure all symlinks are valid
