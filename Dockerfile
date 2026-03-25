# Build Stage
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the frontend and backend
RUN npm run build

# Production Stage
FROM node:20-slim

WORKDIR /app

# Copy built assets and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/.env.example ./.env

# Install production dependencies only
RUN npm install --omit=dev && npm install -g tsx

# Expose the application port
EXPOSE 3000

# Start the application using tsx for the server
CMD ["tsx", "server.ts"]
