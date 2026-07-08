# --- Build Stage ---
FROM node:20-alpine AS builder

# Install OpenSSL (required for Prisma engine)
RUN apk add --no-cache openssl

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY turbo.json ./

# Copy packages config to cache npm install
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/database/package.json ./packages/database/

# Install dependencies for the entire monorepo (ignoring postinstall scripts for now)
RUN npm ci --ignore-scripts

# Copy the rest of the source code
COPY . .

# Generate Prisma Client
RUN npm run generate --workspace=@repo/database

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the frontend application
RUN npx turbo run build --filter=frontend...

# --- Production Runner Stage ---
FROM node:20-alpine AS runner

# Install OpenSSL (required for Prisma runtime)
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Copy build artifacts and dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/frontend/package.json ./apps/frontend/
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next

# Expose Next.js port
EXPOSE 3000

# Start Next.js server
CMD ["npm", "run", "start", "--workspace=frontend"]
