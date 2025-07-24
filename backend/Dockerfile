FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Prisma setup
COPY prisma ./prisma
RUN npx prisma generate

# Copy rest of the code
COPY . .

# Wait-for script
COPY wait-for-db.sh ./wait-for-db.sh
RUN chmod +x ./wait-for-db.sh

EXPOSE 4000

# Wait for DB, then run server
ENTRYPOINT ["./wait-for-db.sh"]
CMD ["npx", "nodemon", "index.js"]

