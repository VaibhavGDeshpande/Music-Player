# Use Debian slim instead of Alpine to ensure glibc compatibility for yt-dlp binaries
FROM node:20-bookworm-slim

# Install Python and FFmpeg, then isolate yt-dlp in a virtualenv to avoid
# Debian's externally-managed Python restriction (PEP 668).
RUN apt-get update && \
    apt-get install -y python3 python3-venv ffmpeg && \
    python3 -m venv /opt/yt-dlp && \
    /opt/yt-dlp/bin/pip install --no-cache-dir --upgrade pip yt-dlp && \
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
ENV PATH="/opt/yt-dlp/bin:${PATH}"
ENV YT_DLP_PATH=/opt/yt-dlp/bin/yt-dlp

EXPOSE 3000

# Start the application
CMD ["npm", "start"]
