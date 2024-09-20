FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx next telemetry disable

RUN mkdir -p /app/.next && \
    chown -R node:node /app

USER node

RUN npm run build
CMD ["npm", "run", "start"]
