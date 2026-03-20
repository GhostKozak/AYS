# Dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Copy production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built assets
COPY --from=builder /app/dist ./dist
# If you have i18n or other assets, copy them here
# Note: nest-cli.json handles asset copying to dist, so we only need dist

EXPOSE 3000

CMD ["node", "dist/main"]
