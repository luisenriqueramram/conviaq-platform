FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Declarar build args y exportarlos como env vars para el build
ARG DATABASE_URL
ARG JWT_SECRET
ARG EVOLUTION_BASE_URL
ARG EVOLUTION_API_KEY
ARG AUTOLAVADO_DB_URL
ENV DATABASE_URL=$DATABASE_URL
ENV JWT_SECRET=$JWT_SECRET
ENV EVOLUTION_BASE_URL=$EVOLUTION_BASE_URL
ENV EVOLUTION_API_KEY=$EVOLUTION_API_KEY
ENV AUTOLAVADO_DB_URL=$AUTOLAVADO_DB_URL

# Forzar Node.js a usar solo IPv4 y deshabilitar IPv6
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
ENV UV_THREADPOOL_SIZE=128

RUN npm run build

EXPOSE 3000

# Deshabilitar IPv6 completamente en runtime
CMD ["sh", "-c", "NODE_OPTIONS='--dns-result-order=ipv4first' npm start"]
