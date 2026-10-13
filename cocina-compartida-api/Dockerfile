# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Run the production application
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /usr/src/app/dist ./dist

# Asegurar existencia de directorio de uploads
RUN mkdir -p uploads

# The default NestJS port is 3000
EXPOSE 3000

CMD ["node", "dist/main"]
