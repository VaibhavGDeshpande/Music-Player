# Use Debian slim instead of Alpine to ensure glibc compatibility for yt-dlp binaries
FROM node:20-bookworm-slim

# Install Python, PIP, and FFmpeg required for yt-dlp to function properly
# We clear the apt cache afterward to keep the image size small
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    pip3 install --no-cache-dir --upgrade yt-dlp && \
    rm -rf /var/lib/apt/lists/*

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