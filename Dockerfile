FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy dependency definition files
COPY package*.json ./

# Install production dependencies
RUN npm install --legacy-peer-deps --only=production

# Copy application source code
COPY server.js ./
COPY campus-spectral.yaml ./
COPY contracts/ ./contracts/

# Set ownership of the application directory to the non-root 'node' user
RUN chown -R node:node /usr/src/app

# Use the non-root 'node' user
USER node

# Expose port
EXPOSE 8000

# Configure Healthcheck
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["node", "server.js"]
