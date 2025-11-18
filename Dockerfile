# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker's caching
COPY package*.json ./

# Install dependencies using npm ci for cleaner builds
RUN npm i

# Copy the rest of the application source code
COPY . .

# Compile TypeScript code
RUN npm run build

# Stage 2: Create the final production image
FROM node:20-alpine AS runner

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker's caching
COPY package*.json ./

# Install only production dependencies
RUN npm i --omit=dev

# Copy the compiled application from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port your app runs on
EXPOSE 3000

# Set the command to run your app
CMD ["node", "dist/server/api.js"]