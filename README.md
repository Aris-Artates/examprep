
This project now includes a local live streaming system using FFmpeg, Nginx RTMP and a Next.js front-end. Follow PART 1–4 below.


## Project Structure

```
examprep/
├── docker-compose.yml
├── .env.example                  ← copy to .env and fill in
├── examprep.code-workspace       ← open this in VS Code
├── frontend/                     ← Next.js 14
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app/                  ← pages (App Router)
│       ├── components/
│       ├── lib/supabase/         ← Supabase clients
│       └── middleware.ts         ← auth protection
├── backend/                      ← FastAPI (Python)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   ├── routers/
│   └── services/
├── ai/                           ← ML + LLM service
│   ├── Dockerfile                ← CUDA-enabled
│   ├── requirements.txt
│   ├── main.py
│   ├── routers/
│   └── services/
│       ├── predictor.py          ← XGBoost + LightGBM ensemble
│       ├── trainer.py            ← model training
│       └── narrator.py          ← Claude API narration
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## STEP 1 — Prerequisites (install once)

### FFmpeg
Install FFmpeg for your platform:

- **Windows**:
  1. Option A – [Download a static build](https://ffmpeg.org/download.html#windows) (e.g. the `ffmpeg-release-essentials.zip`).
     - Extract the archive somewhere convenient such as `C:\ffmpeg`.
     - Add `C:\ffmpeg\bin` to your system **PATH** (Settings → System → About → Advanced system settings → Environment Variables → Path → Edit → New).
     - Open a **new** PowerShell/Command Prompt and run `ffmpeg -version` to confirm.
  2. Option B – use a package manager if you prefer:
     ```powershell
     winget install FFmpeg.FFmpeg
     # or with Chocolatey:
     choco install ffmpeg
     ```
  3. If you already installed but still get “term not recognized”, restart your shell or reboot so the updated PATH takes effect, and ensure the `bin` folder is on the PATH.
- **macOS**: `brew install ffmpeg`.
- **Linux (Ubuntu)**: `sudo apt update && sudo apt install ffmpeg`.

Verify with `ffmpeg -version`. You should see version information rather than an error.


In your WSL terminal:

```bash
# Docker Desktop (install on Windows, not WSL)
# Download from: https://www.docker.com/products/docker-desktop/
# After installing, go to Settings → Resources → WSL Integration
# Enable for your Ubuntu distro

# Verify Docker works in WSL
docker --version
docker compose version

# NVIDIA Container Toolkit (for GPU support)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify GPU is visible to Docker
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

---

## STEP 2 — Supabase Setup  ← FILL IN REQUIRED

1. Go to **https://supabase.com** → New Project
2. Give it a name (e.g. `examprep`) and pick a region close to the Philippines
3. Once created, go to **Settings → API** and copy:
   - `Project URL` → paste as `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
   - `anon public` key → paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` key → paste as `SUPABASE_SERVICE_ROLE_KEY`

4. Run the database schema:
   - Go to **SQL Editor** in your Supabase dashboard
   - Open `supabase/migrations/001_initial_schema.sql`
   - Paste the entire contents and click **Run**

---

## FACEBOOK LOGIN & PRIVATE VIDEO STREAMING

Users must sign in via Facebook before accessing the live stream. We use Supabase's OAuth support for this:

1. In your Supabase project, go to **Authentication → Providers** and enable **Facebook**. Enter your Facebook App's client ID and secret, and configure the redirect URL to `https://<your-domain>/auth/callback`.
2. Make sure your Facebook App is set up with the necessary permissions (typically `email` and `public_profile`).
3. The frontend login page (`frontend/src/app/auth/login/page.tsx`) already includes a "Continue with Facebook" button that calls `supabase.auth.signInWithOAuth({ provider: 'facebook' })`.
4. After successful login, Supabase redirects back to `/auth/callback` and then the user is sent to `/dashboard`.

### Private video embed in dashboard

The dashboard page now includes a Facebook live stream container that is populated once the user is authenticated (via Supabase):

- Backend endpoint `/api/facebook/embed?video_id=<id>` fetches `embed_html` using a **Page Access Token** (set in `.env` as `FB_PAGE_ACCESS_TOKEN`).
- Frontend dashboard loads the embed HTML and injects it into the page.

To configure the token:

```dotenv
FB_PAGE_ACCESS_TOKEN=your_page_access_token_here
```

Restart the backend after editing the `.env` file.

---

## LOCAL LIVE STREAMING SETUP (PART 1–4)

### PART 1 — Python Backend

A new FastAPI service exposes two endpoints:

- `POST /api/stream/start-stream` – launches FFmpeg and begins pushing `sample.mp4` to RTMP.
- `POST /api/stream/stop-stream` – terminates the FFmpeg process.

The code is located in `backend/stream.py` and is already included via `main.py` under the `/api/stream` prefix. Key constants:

```python
STREAM_KEY = "stream"
RTMP_URL = "rtmp://localhost/live/stream"
```

Use `curl` or any HTTP client to control the stream:

```bash
curl -X POST http://localhost:8000/api/stream/start-stream
curl -X POST http://localhost:8000/api/stream/stop-stream
```

`sample.mp4` should be placed in the backend working directory before starting.

### PART 2 — Nginx RTMP Server

Create an `nginx.conf` (example included in project root) that listens for RTMP on port 1935 and serves HLS on port 8080:

```nginx
# see nginx.conf file in repo
```

Start with Docker:

```bash
docker run -d --name nginx-rtmp -p 1935:1935 -p 8080:8080 \
  -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v /tmp/hls:/tmp/hls tiangolo/nginx-rtmp
```

Or install nginx with `nginx-rtmp-module` locally (use your package manager, then place the config above and run `nginx`).

After the RTMP server is running, playing `http://localhost:8080/live/stream.m3u8` will render the HLS stream.

### PART 3 — Next.js Frontend

A new page at `/live` streams HLS using `hls.js`. The code is in `frontend/src/app/live/page.jsx`.
Install the dependency with `npm install` (it was added to `package.json`).

Visit http://localhost:3000/live after starting the RTMP server and hitting `/api/stream/start-stream` – you should see the video autoplay, muted, with controls. If no stream is present, the page displays "Stream is offline.".

### PART 4 — Running Everything

1. **Install FFmpeg** (see STEP 1 above).
2. **Start Nginx RTMP** (using Docker or local install).
3. **Run backend**:
   ```bash
   cd backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1  # or source venv/bin/activate
   pip install -r requirements.txt
   python main.py
   ```
4. **Run frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
5. **Control stream**:
   - Start: `curl -X POST http://localhost:8000/api/stream/start-stream`
   - Stop: `curl -X POST http://localhost:8000/api/stream/stop-stream`

The video from `sample.mp4` will broadcast via RTMP and be available through HLS at `http://localhost:8080/live/stream.m3u8`, which the Next.js player consumes.

---

Continue with earlier steps above.

The landing page no longer shows the video; it appears only on the dashboard after login.

---

## STEP 3 — Google OAuth Setup  ← FILL IN REQUIRED

1. Go to **https://console.cloud.google.com**
2. Create a new project (or use existing)
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
4. Application type: **Web application**
5. Authorized redirect URIs — add:
   ```
   https://your-project-id.supabase.co/auth/v1/callback
   ```
6. Copy **Client ID** and **Client Secret**
7. In Supabase dashboard → **Authentication → Providers → Google**
   - Enable Google
   - Paste your Client ID and Client Secret

---

## STEP 4 — Anthropic API Key  ← FILL IN REQUIRED

1. Go to **https://console.anthropic.com**
2. Create an API key
3. Paste it as `ANTHROPIC_API_KEY` in your `.env`

---

## STEP 5 — Create your .env file

```bash
# In the examprep/ root folder:
cp .env.example .env
```

Open `.env` and fill in every value marked `← FILL IN`.

Generate a SECRET_KEY with:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## STEP 6 — Open in VS Code

```bash
# From your WSL terminal, in the examprep/ folder:
code examprep.code-workspace
```

Install the recommended extensions when VS Code prompts you.

---

## STEP 7 — Run with Docker

```bash
# Make sure you're in the examprep/ root folder
cd examprep

# Build and start all services (first run takes 5-10 min to download images)
docker compose up --build

# You should see logs from all 4 services.
# Wait until you see:
#   frontend  | ▲ Next.js 14 ready on http://localhost:3000
#   backend   | INFO: Application startup complete
#   ai        | INFO: Application startup complete
```

Open your browser: **http://localhost:3000**

---

## STEP 8 — Train the AI Model

Once everything is running, trigger model training:

```bash
# Option A: from terminal
curl -X POST http://localhost:8001/train/

# Option B: from browser
# Go to http://localhost:8001/docs → POST /train/ → Execute
```

Training uses dummy data by default. To use your real PSHS data:

```bash
# Copy your CSV files into the ai/data/ folder
# Expected columns: math_score, science_score, english_score,
#                   abstract_reasoning_score, verbal_score,
#                   total_score, campus_label (0-14)
cp your_data.csv ./ai/data/

# Then retrigger training
curl -X POST http://localhost:8001/train/
```

---

## Service URLs

| URL | What it is |
|-----|-----------|
| http://localhost:3000 | Your app (open this) |
| http://localhost:8000/docs | Backend API docs |
| http://localhost:8001/docs | AI Service API docs |
| http://localhost:8001/train/status | Check if model is trained |

---

## Useful Docker Commands

```bash
# View logs for one service
docker compose logs -f frontend
docker compose logs -f ai

# Restart one service after code changes
docker compose restart backend

# Rebuild one service (after changing Dockerfile or requirements)
docker compose up --build ai

# Open a shell inside a container
docker compose exec ai bash
docker compose exec backend bash

# Stop everything
docker compose down

# Stop and wipe volumes (WARNING: deletes trained models)
docker compose down -v
```

---

## What Needs to Be Filled In (Summary)

| What | Where | How to get it |
|------|-------|---------------|
| Supabase Project URL | `.env` | Supabase Dashboard → Settings → API |
| Supabase Anon Key | `.env` | Supabase Dashboard → Settings → API |
| Supabase Service Role Key | `.env` | Supabase Dashboard → Settings → API |
| Google Client ID | `.env` + Supabase Auth | Google Cloud Console |
| Google Client Secret | `.env` + Supabase Auth | Google Cloud Console |
| Anthropic API Key | `.env` | console.anthropic.com |
| SECRET_KEY | `.env` | Generate with python command above |
| Run SQL schema | Supabase SQL Editor | File: supabase/migrations/001_initial_schema.sql |

---

## Troubleshooting

**Docker can't find GPU:**
```bash
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
# If this fails, re-run the NVIDIA Container Toolkit setup in Step 1
```

**Port already in use:**
```bash
# Find what's using port 3000
sudo lsof -i :3000
# Change ports in docker-compose.yml if needed
```

**Supabase connection errors:**
- Double-check your `.env` values match exactly what's in the Supabase dashboard
- Make sure you ran the SQL migration in Step 2

**AI service slow to start:**
- Normal — it's loading the CUDA runtime. Wait ~30 seconds after `docker compose up`
