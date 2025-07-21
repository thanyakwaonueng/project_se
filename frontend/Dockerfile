# vite-dev.Dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Use polling to detect file changes inside Docker
ENV CHOKIDAR_USEPOLLING=true

EXPOSE 5173
CMD ["npm", "run", "dev"]
