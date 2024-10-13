FROM node:14-alpine

WORKDIR /app

COPY package*.json ./
COPY pos.yaml ./

RUN npm install @stoplight/prism-cli

EXPOSE 3000

CMD ["npx", "prism", "mock", "pos.yaml", "-h", "0.0.0.0", "-p", "3000"]
