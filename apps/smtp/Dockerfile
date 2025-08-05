# SMTP App Dockerfile - Fixed for monorepo

FROM node:20-alpine
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files and fix script
COPY package*.json ./
COPY fix-package-json.cjs ./

# Fix package.json for Docker build
RUN node fix-package-json.cjs package.json

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=development

# Start in development mode
CMD ["npm", "run", "dev"]