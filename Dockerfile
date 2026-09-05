# --- Stage 1: Build ---
    FROM oven/bun:alpine AS builder
    WORKDIR /app
    
    # Bun uses bun.lockb (or bun.lock depending on your version) instead of yarn.lock
    COPY package.json bun.lock ./
    RUN bun install --frozen-lockfile
    
    COPY . .
    
    RUN bun run build
    
    # --- Stage 2: Run ---
    FROM oven/bun:alpine
    WORKDIR /app
    
    COPY package.json bun.lock ./
    RUN bun install --production --frozen-lockfile
    
    COPY --from=builder /app/dist ./dist
    
    EXPOSE 3000
    
    # Use bun as the runtime executor for your compiled output
    CMD ["bun", "dist/server.js"]