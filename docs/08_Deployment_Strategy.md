---
title: Deployment Strategy
date: 2026-03-29
tags:
  - expense-tracker
  - deployment
  - docker
  - devops
  - documentation
aliases:
  - Deploy Guide
  - Setup Guide
  - Installation
status: active
related:
  - "[[NoneREADME]]"
  - "[[docs/03_Architecture]]"
  - "[[docs/04_Tech_Stack]]"
  - "[[docs/07_API_Reference]]"
---

# Deployment Strategy

> [!info] One-Command Deploy
> The full stack — PostgreSQL 15, FastAPI backend, and React frontend — starts with a single `docker compose up --build`. No cloud accounts, no subscriptions, no external APIs required.

See also: [[NoneREADME]] · [[docs/03_Architecture]] · [[docs/04_Tech_Stack]] · [[docs/07_API_Reference]]

---

## Architecture Overview

```mermaid
graph TD
    subgraph Host["Host Machine (Windows / macOS)"]
        subgraph DC["Docker Compose Network"]
            DB[(PostgreSQL 15\nexpense_db\nport 5432)]
            BE[FastAPI Backend\nexpense_backend\nport 8000]
            FE[React + Vite Frontend\nexpense_frontend\nport 5173]
        end
        VOL[(Named Volume\npostgres_data)]
    end
    Browser[Browser / PWA] -->|http://localhost:5173| FE
    FE -->|http://localhost:8000/api/v1| BE
    BE -->|SQLModel / asyncpg| DB
    DB --- VOL
```

---

## Deployment Strategies

> [!tip] Which strategy to use?
> - **Strategy A** — Docker (all services containerised) → recommended for everyone; zero dependency conflicts
> - **Strategy B** — Local Dev (DB in Docker, backend + frontend run natively) → best for active development with hot-reload and debugger support

| | Strategy A — Full Docker | Strategy B — Local Dev |
|---|---|---|
| **PostgreSQL** | Docker container | Docker container |
| **FastAPI backend** | Docker container | `uvicorn` on host Python |
| **React frontend** | Docker container | `npm run dev` on host Node |
| **Hot-reload** | ✅ (volume mount) | ✅ (native) |
| **Debugger** | Needs remote attach | ✅ Native |
| **Best for** | Demos, production | Daily development |

---

## Tech Stack — Deployment Relevant

| Component | Technology | Version | Port |
|---|---|---|---|
| Database | PostgreSQL (Alpine) | 15 | 5432 |
| Backend runtime | Python Slim | 3.11 | 8000 |
| Backend framework | FastAPI + Uvicorn | 0.111 | — |
| Frontend runtime | Node Alpine | 18 | — |
| Frontend dev server | Vite | 5.2.13 | 5173 |
| Container orchestration | Docker Compose | 3.9 | — |
| DB volume | Docker named volume | — | — |
| Line-ending safety | `.gitattributes` | — | LF enforced |

---

## Prerequisites

### Windows

> [!warning] WSL 2 required
> Docker Desktop on Windows uses WSL 2 as its backend. Ensure WSL 2 is enabled before installing Docker Desktop.

1. **Enable WSL 2** (PowerShell as Administrator):
   ```powershell
   wsl --install
   wsl --set-default-version 2
   ```

2. **Install Docker Desktop for Windows**
   - Download: https://www.docker.com/products/docker-desktop/
   - During install: enable "Use WSL 2 based engine"
   - Restart your machine after install

3. **Install Git for Windows**
   - Download: https://git-scm.com/download/win
   - During install: select **"Checkout as-is, commit Unix-style line endings"** (critical — prevents `\r` errors in Docker)

4. **Verify installs** (PowerShell or Git Bash):
   ```powershell
   docker --version        # Docker version 25.x.x
   docker compose version  # Docker Compose version v2.x.x
   git --version           # git version 2.x.x
   ```

> [!note] Optional (Strategy B only)
> - Python 3.11+: https://www.python.org/downloads/
> - Node.js 18+: https://nodejs.org/en/download

---

### macOS

> [!note] Apple Silicon (M1/M2/M3) fully supported
> Docker Desktop ships universal binaries. No Rosetta workaround needed.

1. **Install Docker Desktop for Mac**
   - Download: https://www.docker.com/products/docker-desktop/
   - Drag to Applications, launch, complete setup wizard
   - Recommended: Settings → Resources → Memory: **≥ 4 GB**

2. **Install Git** (usually pre-installed via Xcode CLI tools):
   ```bash
   git --version
   # If missing:
   xcode-select --install
   ```

3. **Verify installs**:
   ```bash
   docker --version        # Docker version 25.x.x
   docker compose version  # Docker Compose version v2.x.x
   git --version
   ```

> [!note] Optional (Strategy B only)
> - Python 3.11+: `brew install python@3.11` or https://python.org
> - Node.js 18+: `brew install node@18` or https://nodejs.org

---

## Environment Configuration

> [!important] Never commit your `.env` file
> `backend/.env` is in `.gitignore`. The `.env.example` template is safe to commit.

### Step 1 — Copy the template

```bash
# From the repo root
cp backend/.env.example backend/.env
```

### Step 2 — Edit `backend/.env`

```dotenv
# PostgreSQL connection
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_strong_password_here
POSTGRES_DB=expense_tracker
POSTGRES_HOST=db               # Docker service name — do NOT change for Strategy A
POSTGRES_PORT=5432

# Constructed URL (used by SQLModel / asyncpg)
DATABASE_URL=postgresql://postgres:your_strong_password_here@db:5432/expense_tracker

# CORS — React dev server origin
ALLOWED_ORIGINS=http://localhost:5173
```

> [!warning] Strategy B — Local Dev only
> Change `POSTGRES_HOST=db` → `POSTGRES_HOST=localhost` and update `DATABASE_URL` accordingly when running the backend natively.

### Environment Variables Reference

| Variable | Required | Example | Notes |
|---|---|---|---|
| `POSTGRES_USER` | ✅ | `postgres` | DB superuser name |
| `POSTGRES_PASSWORD` | ✅ | `s3cur3pass!` | Min 8 chars recommended |
| `POSTGRES_DB` | ✅ | `expense_tracker` | Database name auto-created on first start |
| `POSTGRES_HOST` | ✅ | `db` (Docker) / `localhost` (local) | Service name in Compose network |
| `POSTGRES_PORT` | ✅ | `5432` | Standard PostgreSQL port |
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:port/db` | Full SQLAlchemy connection string |
| `ALLOWED_ORIGINS` | ✅ | `http://localhost:5173` | FastAPI CORS allowed origins |

---

## Strategy A — Full Docker Deploy

### Windows

```powershell
# 1. Clone the repo
git clone https://github.com/Sayu-V/expense-tracker.git
cd expense-tracker

# 2. Set up environment
copy backend\.env.example backend\.env
# Edit backend\.env with your preferred text editor

# 3. Build and start all services
docker compose up --build

# 4. (Subsequent starts — no rebuild needed)
docker compose up
```

### macOS / Linux

```bash
# 1. Clone the repo
git clone https://github.com/Sayu-V/expense-tracker.git
cd expense-tracker

# 2. Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env — set POSTGRES_PASSWORD and DATABASE_URL

# 3. Build and start all services
docker compose up --build

# 4. (Subsequent starts — no rebuild needed)
docker compose up
```

### Access the App

| Service | URL |
|---|---|
| React frontend | http://localhost:5173 |
| FastAPI backend | http://localhost:8000 |
| Swagger UI (API docs) | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| Health check | http://localhost:8000/health |

### Stop / Restart

```bash
# Stop (keeps data volume intact)
docker compose down

# Stop AND delete all data (destructive!)
docker compose down -v

# Restart a single service
docker compose restart backend

# View logs
docker compose logs -f
docker compose logs -f backend
docker compose logs -f db
```

---

## Strategy B — Local Development

### Database only in Docker

```bash
# Start only the PostgreSQL container
docker compose up db -d
```

### Backend — native Python

```bash
cd backend

# Create and activate virtual environment
# macOS / Linux:
python3 -m venv venv
source venv/bin/activate

# Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Update .env — change POSTGRES_HOST to localhost
# POSTGRES_HOST=localhost
# DATABASE_URL=postgresql://postgres:yourpass@localhost:5432/expense_tracker

# Start with hot-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend — native Node

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
# → http://localhost:5173
```

> [!tip] Hot-reload in both
> Both `uvicorn --reload` and `npm run dev` watch for file changes and reload automatically — ideal for active development.

---

## Database

### Container Configuration

```yaml
# docker-compose.yml excerpt
db:
  image: postgres:15-alpine       # Lightweight Alpine-based image
  container_name: expense_db
  restart: unless-stopped         # Auto-restarts if Docker restarts
  env_file:
    - ./backend/.env              # POSTGRES_USER / PASSWORD / DB
  ports:
    - "5432:5432"                 # Exposed on host for local tools (DBeaver, pgAdmin)
  volumes:
    - postgres_data:/var/lib/postgresql/data   # Named volume = persistent data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres -d expense_tracker"]
    interval: 5s
    timeout: 5s
    retries: 5
```

### Data Persistence

> [!important] Data survives container restarts
> The `postgres_data` named volume stores all data outside the container. Running `docker compose down` (without `-v`) preserves your data. Only `docker compose down -v` deletes it.

```bash
# List Docker volumes
docker volume ls | grep postgres

# Inspect volume location
docker volume inspect expense-tracker_postgres_data
```

### Migrations

SQLModel auto-creates all tables on backend startup via `SQLModel.metadata.create_all(engine)`. There are no migration files to run manually — the schema is always up to date when the backend starts.

Startup ALTER TABLE migrations (added in v1.1.0) safely add new columns with `IF NOT EXISTS`, making upgrades zero-downtime.

### Backup & Restore

```bash
# Backup (while containers are running)
docker exec expense_db pg_dump -U postgres expense_tracker > backup_$(date +%Y%m%d).sql

# Restore from backup
docker exec -i expense_db psql -U postgres expense_tracker < backup_20260329.sql

# Backup as compressed archive
docker exec expense_db pg_dump -U postgres -Fc expense_tracker > backup_$(date +%Y%m%d).dump

# Restore compressed archive
docker exec -i expense_db pg_restore -U postgres -d expense_tracker < backup_20260329.dump
```

### Connect with a GUI Tool

| Tool | Connection |
|---|---|
| DBeaver | Host: `localhost` · Port: `5432` · DB: `expense_tracker` · User: from `.env` |
| pgAdmin 4 | Same settings as DBeaver |
| TablePlus | Same settings — works natively on macOS |
| psql CLI | `psql -h localhost -U postgres -d expense_tracker` |

---

## Backend

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# System deps: gcc (for psycopg2 compile), libpq-dev (PostgreSQL client)
RUN apt-get update && apt-get install -y gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose Override (Development)

In `docker-compose.yml`, the backend service overrides `CMD` to add `--reload`:

```yaml
command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
volumes:
  - ./backend:/app          # Live source mount — changes reflect instantly
```

### Startup Sequence

```mermaid
sequenceDiagram
    participant DC as Docker Compose
    participant DB as PostgreSQL
    participant BE as FastAPI
    DC->>DB: Start db service
    DB-->>DC: healthcheck passes (pg_isready)
    DC->>BE: Start backend (depends_on: db healthy)
    BE->>DB: SQLModel.create_all() — create tables if not exist
    BE->>DB: Seed 25 default categories (if table empty)
    BE-->>DC: Uvicorn listening on :8000
```

### Key Endpoints at Startup

```bash
# Verify backend is running
curl http://localhost:8000/health
# → {"status": "ok", "version": "2.3.0"}

# View auto-generated API docs
open http://localhost:8000/docs      # macOS
start http://localhost:8000/docs     # Windows
```

---

## Frontend

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install          # Installs node_modules inside container

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]   # --host exposes Vite to container network
```

### Docker Compose Volumes

```yaml
volumes:
  - ./frontend:/app           # Live source mount
  - /app/node_modules         # Anonymous volume — preserves container node_modules
                              # (prevents host node_modules from overwriting)
```

> [!tip] Why the anonymous node_modules volume?
> Without `/app/node_modules` as a separate anonymous volume, the host `./frontend` mount would overwrite the container's installed `node_modules` with whatever is on your host — causing missing-package errors on Windows where paths differ.

### PWA & Service Worker

The app ships a Service Worker (`frontend/public/sw.js`) that enables offline use:

| Cache strategy | Scope | Behaviour |
|---|---|---|
| Cache-first | App shell (HTML, JS, CSS, fonts) | Loads instantly from cache; revalidates in background |
| Network-first | API calls (`/api/…`) | Fresh data when online; stale cache fallback offline |

The SW cache name is versioned (`et-shell-v2.3.0`) — bumping the version forces old caches to be purged on the next SW activation.

### Build for Production

> [!note] The current Dockerfile uses Vite dev server for simplicity
> For a production deployment, replace with a multi-stage build using `nginx:alpine`:

```dockerfile
# Production Dockerfile (multi-stage)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build           # Outputs to /app/dist

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

---

## Docker Compose — Deep Dive

### Full `docker-compose.yml`

```yaml
version: "3.9"

services:
  db:
    image: postgres:15-alpine
    container_name: expense_db
    restart: unless-stopped
    env_file: ./backend/.env          # POSTGRES_USER / PASSWORD / DB
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d expense_tracker"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: expense_backend
    restart: unless-stopped
    env_file: ./backend/.env
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy    # Waits for pg_isready before starting
    volumes:
      - ./backend:/app                # Hot-reload source mount
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: expense_frontend
    restart: unless-stopped
    ports:
      - "5173:5173"
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:                      # Named volume — persists across container restarts
```

### Service Dependency Order

```mermaid
graph LR
    A[Docker Compose up] --> B[db starts]
    B -->|healthcheck passes| C[backend starts]
    C --> D[frontend starts]
    D --> E[App ready at localhost:5173]
```

### Useful Docker Commands

```bash
# Start in background (detached)
docker compose up -d --build

# Show running containers
docker compose ps

# Stream logs from all services
docker compose logs -f

# Exec into a running container
docker exec -it expense_backend bash
docker exec -it expense_db psql -U postgres -d expense_tracker

# Rebuild a single service image
docker compose build backend

# Restart one service without touching others
docker compose restart frontend

# Remove containers + network (volume preserved)
docker compose down

# Full reset including data volume
docker compose down -v
```

---

## GitHub Workflow

### Clone & Branch

```bash
# Clone
git clone https://github.com/Sayu-V/expense-tracker.git
cd expense-tracker

# Create feature branch
git checkout -b feature/your-feature-name

# Push and set upstream
git push -u origin feature/your-feature-name
```

### Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable, tagged releases only |
| `feature/v2.3.0` | Current development branch |
| `feature/vX.Y.Z` | Future version branches |

### `.gitattributes` — Line Ending Safety

```gitattributes
* text=auto eol=lf       # All text files: Unix LF on checkout
*.png  binary
*.jpg  binary
*.docx binary
*.pdf  binary
*.zip  binary
```

> [!important] Why this matters on Windows
> Without `eol=lf`, Git on Windows converts line endings to CRLF (`\r\n`). When Docker mounts these files into a Linux container, shell scripts fail with `\r: command not found`. The `.gitattributes` file (added in v2.3.0) prevents this entirely.

### Pre-push Checklist

```bash
# 1. Verify backend tests pass
cd backend
python -m pytest tests/ -v

# 2. Verify Docker build is clean
docker compose build

# 3. Smoke test
docker compose up -d
curl http://localhost:8000/health   # → {"status":"ok","version":"2.3.0"}
curl http://localhost:5173          # → React app HTML

# 4. Commit and push
git add .
git commit -m "feat: your feature description"
git push
```

---

## Troubleshooting

### Windows

> [!warning] `\r: command not found` in Docker logs

**Cause:** CRLF line endings in shell scripts or source files mounted into Linux containers.

**Fix:**
```bash
# Convert existing files
git config core.autocrlf false
git rm --cached -r .
git reset --hard
```
Or clone fresh with `.gitattributes` already present (v2.3.0+).

---

> [!warning] `docker compose` not found — only `docker-compose` works

**Cause:** Older Docker Desktop version using the V1 plugin syntax.

**Fix:** Update Docker Desktop to 4.x+ or use `docker-compose` (with hyphen) everywhere.

---

> [!warning] Port 5432 already in use

**Cause:** A local PostgreSQL install is already listening on port 5432.

**Fix:** Change the host port mapping in `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"    # Map container 5432 to host 5433
```
Then update `DATABASE_URL` to use `localhost:5433` in Strategy B.

---

> [!warning] Slow Docker performance on Windows

**Cause:** Files are on the Windows filesystem (NTFS) but mounted into WSL 2 via `/mnt/c/`.

**Fix:** Clone the repo inside WSL 2 itself (`~/projects/expense-tracker`) rather than under `/mnt/c/Users/...`. Volume performance improves dramatically.

---

### macOS

> [!warning] Backend exits with `could not connect to server`

**Cause:** Backend started before PostgreSQL was ready (healthcheck may not have completed).

**Fix:** The `depends_on: condition: service_healthy` in Compose should handle this. If it still fails, increase `retries` in the db healthcheck to `10`.

---

> [!warning] Docker Desktop runs out of memory

**Symptom:** Containers crash with OOM errors; `docker stats` shows memory at 100%.

**Fix:** Docker Desktop → Settings → Resources → Memory: set to **4 GB minimum** (6 GB recommended if running other apps).

---

> [!warning] `npm run dev` EACCES on port 5173 (Mac)

**Cause:** Rare — another process holds port 5173.

**Fix:**
```bash
lsof -i :5173          # Find the process
kill -9 <PID>          # Kill it
```

---

> [!warning] Apple Silicon (M1/M2): `exec format error`

**Cause:** A Docker image was built for `linux/amd64` and not `linux/arm64`.

**Fix:** Both `postgres:15-alpine`, `python:3.11-slim`, and `node:18-alpine` ship multi-arch manifests and work natively on ARM. If a custom base image causes issues, force the platform:
```yaml
platform: linux/arm64
```

---

## Quick Reference Card

```
CLONE     git clone https://github.com/Sayu-V/expense-tracker.git
SETUP     cp backend/.env.example backend/.env  →  edit password
START     docker compose up --build
APP       http://localhost:5173
API       http://localhost:8000/docs
STOP      docker compose down
LOGS      docker compose logs -f
RESET     docker compose down -v   ⚠️  deletes all data
BACKUP    docker exec expense_db pg_dump -U postgres expense_tracker > backup.sql
TESTS     cd backend && python -m pytest tests/ -v
```

---

#deployment #docker #devops #expense-tracker #v2.3.0
