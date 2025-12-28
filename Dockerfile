FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Declarar build args y exportarlos como env vars para el build
ARG DATABASE_URL
ARG JWT_SECRET
ENV DATABASE_URL=$DATABASE_URL
ENV JWT_SECRET=$JWT_SECRET

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
