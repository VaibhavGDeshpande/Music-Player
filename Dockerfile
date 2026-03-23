FROM node:20-alpine

# Install Python and FFmpeg required for yt-dlp to function properly
RUN apk add --no-cache python3 ffmpeg

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy all source files
COPY . .

# Build the Next.js application
RUN npm run build

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Start the application
CMD ["npm", "start"]
