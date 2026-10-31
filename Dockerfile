# ---- build the React client ----
FROM node:22-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- runtime: API + static client ----
FROM node:22-alpine
ENV NODE_ENV=production PORT=5000
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client /app/client/dist /app/client/dist
EXPOSE 5000
HEALTHCHECK CMD wget -qO- http://localhost:5000/api/v1/health || exit 1
CMD ["node", "src/server.js"]
