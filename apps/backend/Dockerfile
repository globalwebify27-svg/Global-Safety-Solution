# --- Build Stage ---
FROM node:20-alpine AS builder

# Install OpenSSL (required for Prisma engine)
RUN apk add --no-cache openssl

# Set the working directory inside the container
WORKDIR /app

# Copy root lockfile and packages config to install dependencies
COPY package*.json ./
COPY turbo.json ./

# Copy all workspaces/packages package.json files first (for caching layers)
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/database/package.json ./packages/database/

# Install dependencies for the entire monorepo (ignoring postinstall scripts for now)
RUN npm ci --ignore-scripts

# Copy the rest of the application code
COPY . .

# Generate Prisma Client (since backend depends on @repo/database)
RUN npm run generate --workspace=@repo/database

# Build the backend application
RUN npx turbo run build --filter=backend...

# --- Production Runner Stage ---
FROM node:20-alpine AS runner

# Install OpenSSL (required for Prisma runtime)
RUN apk add --no-cache openssl

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy built code and required files from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/apps/backend/tsconfig.json ./apps/backend/
COPY --from=builder /app/apps/backend/seed-rbac.ts ./apps/backend/
COPY --from=builder /app/apps/backend/seed-admin.ts ./apps/backend/
COPY --from=builder /app/apps/backend/reset.ts ./apps/backend/
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/database ./packages/database

# Expose port for the backend service
EXPOSE 3001

# Command to run the NestJS application in production
CMD ["npm", "run", "start:prod", "--workspace=backend"]
