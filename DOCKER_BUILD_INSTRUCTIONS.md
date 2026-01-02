# 🚀 Docker Build Instructions for WorkMonitor

## ⚠️ CRITICAL: Working Directory Issue

**Your files are in TWO different locations:**

1. **Project files (modified)**: `/tmp/cc-agent/62089258/project/`
2. **Your Docker directory**: `/mnt/c/workmonitor/`

## 🔧 IMMEDIATE FIX REQUIRED

### Step 1: Copy Updated Files to Your Docker Directory

```bash
# Copy the updated .env file
cp /tmp/cc-agent/62089258/project/.env /mnt/c/workmonitor/.env

# Copy the updated package.json
cp /tmp/cc-agent/62089258/project/frontend/package.json /mnt/c/workmonitor/frontend/package.json

# Copy the updated Dockerfile
cp /tmp/cc-agent/62089258/project/Dockerfile.frontend /mnt/c/workmonitor/Dockerfile.frontend

# Copy the docker-compose files
cp /tmp/cc-agent/62089258/project/docker-compose.yml /mnt/c/workmonitor/docker-compose.yml
cp /tmp/cc-agent/62089258/project/docker-compose.override.yml /mnt/c/workmonitor/docker-compose.override.yml

# Delete the stale package-lock.json
rm -f /mnt/c/workmonitor/frontend/package-lock.json
```

### Step 2: Verify .env File is in Place

```bash
cd /mnt/c/workmonitor
ls -la .env

# Should show:
# -rw-r--r-- 1 user user 3851 Jan  2 20:52 .env
```

### Step 3: Verify .env is Being Read

```bash
cd /mnt/c/workmonitor
docker compose config | head -20

# Should NOT show warnings about missing variables
```

### Step 4: Build Docker Images

```bash
cd /mnt/c/workmonitor
docker compose build --no-cache
```

---

## 📋 WHAT WAS FIXED

### Issue 1: Stale package-lock.json
- **Problem**: Lock file had React 19 & ESLint 9 (old versions)
- **Fix**: Deleted `package-lock.json`, will regenerate during Docker build

### Issue 2: React Router v7 Incompatibility
- **Problem**: `react-router-dom@7.5.1` requires Node 20+
- **Fix**: Downgraded to `react-router-dom@6.28.0` (works with Node 18)

### Issue 3: Docker using npm ci with stale lock file
- **Problem**: `npm ci` requires exact lock file match
- **Fix**: Changed to `npm install` which regenerates lock file

### Issue 4: .env file not in Docker working directory
- **Problem**: Docker Compose run from `/mnt/c/workmonitor` but `.env` in different location
- **Fix**: Need to copy `.env` to Docker working directory

---

## ✅ UPDATED FILES

| File | Change Made | Reason |
|------|-------------|--------|
| `frontend/package.json` | `react-router-dom: ^6.28.0` | Node 18 compatibility |
| `Dockerfile.frontend` | `npm ci` → `npm install` | Regenerate lock file |
| `frontend/package-lock.json` | Deleted | Will regenerate |
| `.env` | Created with all variables | Docker Compose needs it |

---

## 🎯 EXPECTED RESULT

After copying files and rebuilding:

```bash
$ docker compose build --no-cache

[+] Building 300.5s (40/40) FINISHED
 => [frontend builder] RUN npm install --legacy-peer-deps  ✅
 => [frontend builder] RUN npm run build                   ✅
 => [backend builder] RUN pip install --no-cache-dir       ✅
 => exporting to image                                     ✅

$ docker compose up -d

[+] Running 5/5
 ✔ Container workmonitor-postgres   Healthy
 ✔ Container workmonitor-minio      Healthy
 ✔ Container workmonitor-backend    Started
 ✔ Container workmonitor-frontend   Started
 ✔ Container workmonitor-nginx      Started
```

---

## 🚨 ALTERNATIVE: Work from Project Directory

Instead of copying files, you can work directly from the project directory:

```bash
# Change to project directory
cd /tmp/cc-agent/62089258/project

# Build from here
docker compose build --no-cache

# Run from here
docker compose up -d
```

This directory has all the updated files already in place.

---

## 📝 VERIFICATION CHECKLIST

Before building:

- [ ] Verify `.env` file exists in your Docker directory
- [ ] Verify `.env` has all required variables set
- [ ] Verify `package-lock.json` is deleted in frontend/
- [ ] Verify `frontend/package.json` has `react-router-dom: ^6.28.0`
- [ ] Run `docker compose config` and verify NO warnings

After building:

- [ ] All Docker images build successfully
- [ ] All services start without errors
- [ ] `docker compose ps` shows all services as healthy
- [ ] Frontend accessible at http://localhost:3000
- [ ] Backend accessible at http://localhost:8000

---

## 🆘 IF BUILD STILL FAILS

### Check .env File Loading:

```bash
cd /mnt/c/workmonitor
cat .env | head -5

# Should show:
# # ============================================================
# # WorkMonitor Environment Configuration
# # ============================================================
#
# # ============================================================
```

### Check Environment Variables are Being Loaded:

```bash
cd /mnt/c/workmonitor
docker compose config | grep "DB_USER"

# Should show:
# POSTGRES_USER: workmonitor_user
# NOT blank strings
```

### Re-copy All Files:

```bash
# Full reset
rm -rf /mnt/c/workmonitor/*
cp -r /tmp/cc-agent/62089258/project/* /mnt/c/workmonitor/

# Build
cd /mnt/c/workmonitor
docker compose build --no-cache
```

---

**Next Step**: Run the copy commands above, then try `docker compose build --no-cache` again.
