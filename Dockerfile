# syntax=docker/dockerfile:1

# ============================================================
# Stage 1: Frontend build (Vite + React PWA)
# ============================================================
FROM node:22-alpine AS frontend-build
WORKDIR /app

# VITE_* Variablen werden zur Build-Zeit in das Bundle eingebacken.
# Für ein Single-Origin-Deployment (Frontend + API im selben Container)
# reicht der relative Pfad "/api" – kein CORS nötig.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ============================================================
# Stage 2: Backend Dependencies (native better-sqlite3 build)
# ============================================================
FROM node:22-slim AS backend-deps
WORKDIR /app/backend

# Build-Tools für das native Modul better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# ============================================================
# Stage 3: Production
# ============================================================
FROM node:22-slim AS production
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    FRONTEND_DIST=/app/dist

# Frontend-Build aus Stage 1
COPY --from=frontend-build /app/dist ./dist

# node_modules (inkl. gebautem better-sqlite3) aus Stage 2
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules

# Backend-Quellcode aus dem Build-Kontext (eindeutige, separate COPYs)
COPY backend/package.json ./backend/package.json
COPY backend/src ./backend/src

# Datenverzeichnis für SQLite (mit Volume belegen für Persistenz)
RUN mkdir -p /app/backend/data

EXPOSE 3001

# Healthcheck für Coolify / Docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "backend/src/server.js"]
