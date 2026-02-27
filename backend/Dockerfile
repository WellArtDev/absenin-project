FROM node:18-alpine
RUN apk add --no-cache vips-dev build-base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
RUN mkdir -p uploads/selfies
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "src/app.js"]
