# ── DevPilot Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./
RUN npm install --production

# Copy source
COPY backend/ .

# Create non-root user
RUN addgroup -S devpilot && adduser -S devpilot -G devpilot
USER devpilot

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "server.js"]
