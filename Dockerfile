# Backend API only (subdomain B). Frontend is hosted separately (e.g. S3 subdomain A).

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY index.js ./

ENV NODE_ENV=production
EXPOSE 8080

# Env vars are NOT set here — pass at run time (see .env.example).
CMD ["node", "index.js"]
