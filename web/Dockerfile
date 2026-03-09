FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Environment setup
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOST=0.0.0.0
ENV PORT=3001

EXPOSE 3001

# Start in dev mode to bypass heavy Webpack OOM issues on WSL2, binding explicitly to 0.0.0.0
CMD ["npx", "next", "dev", "-H", "0.0.0.0", "-p", "3000"]
