FROM node:25-alpine

# Install build tools needed for native modules and TypeScript compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first so npm ci can use Docker layer cache
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --production=false

# Copy source and config files
COPY . .

# Compile TypeScript to JavaScript
RUN npx tsc

# Create logs folder
RUN mkdir -p logs

# Expose port 
EXPOSE 8000

# Run the compiled JS entrypoint
CMD ["node", "dist/server.js"]
