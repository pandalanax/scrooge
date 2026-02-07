FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY server.js ./
COPY public ./public

# Create data directory and set permissions
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Set environment variable for data persistence
ENV DATA_DIR=/app/data

# Run the application
CMD ["node", "server.js"]
