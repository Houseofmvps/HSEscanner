# AI Safety Vision - Unified Render Deployment

## 🚀 Step-by-Step Deployment Guide

### Step 1: Set Up MongoDB Atlas (FREE)

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create free account → Click **"Build a Database"**
3. Select **FREE M0 Cluster** → Choose region → Click **"Create"**
4. Create database user:
   - Username: `safetyuser`
   - Password: (save this!)
5. Go to **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (0.0.0.0/0)
6. Go to **Database** → **Connect** → **Connect your application**
7. Copy connection string (looks like):
   ```
   mongodb+srv://safetyuser:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
8. Add database name to the end:
   ```
   mongodb+srv://safetyuser:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/safety_vision?retryWrites=true&w=majority
   ```

---

### Step 2: Get Your OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up / Log in
3. Click **"API Keys"** in the left menu
4. Click **"Create new secret key"**
5. Copy your key (starts with `sk-...`)

---

### Step 3: Save Code to GitHub

1. In Emergent, click **"Save to GitHub"**
2. Connect your GitHub account if needed
3. Create/select repository
4. Code will be pushed automatically

---

### Step 4: Deploy on Render

1. Go to [render.com](https://render.com) → Sign up (free)

2. Click **"New +"** → **"Web Service"**

3. Click **"Connect a repository"** → Select your GitHub repo

4. Configure the service:

   | Setting | Value |
   |---------|-------|
   | **Name** | `ai-safety-vision` |
   | **Region** | Choose closest to you |
   | **Branch** | `main` |
   | **Root Directory** | (leave empty) |
   | **Runtime** | `Python 3` |
   | **Build Command** | `chmod +x build.sh && ./build.sh` |
   | **Start Command** | `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT` |

5. Click **"Advanced"** → **"Add Environment Variable"**:

   | Key | Value |
   |-----|-------|
   | `MONGO_URL` | `mongodb+srv://safetyuser:PASSWORD@cluster0.xxxxx.mongodb.net/safety_vision?retryWrites=true&w=majority` |
   | `DB_NAME` | `safety_vision` |
   | `OPENAI_API_KEY` | `sk-xxxxx` (your OpenAI API key) |
   | `CORS_ORIGINS` | `*` |
   | `PYTHON_VERSION` | `3.11.0` |
   | `NODE_VERSION` | `18` |

6. Click **"Create Web Service"**

7. Wait 5-10 minutes for deployment

8. Your app is live at: `https://ai-safety-vision.onrender.com` 🎉

---

## 📁 Project Structure (Unified)

```
/
├── build.sh              # Unified build script
├── render.yaml           # Render blueprint
├── frontend/             # React frontend
│   ├── src/
│   ├── package.json
│   └── ...
└── backend/              # FastAPI backend
    ├── server.py         # Serves API + static files
    ├── requirements.txt
    └── static/           # React build (created during build)
```

---

## ⚠️ Important Notes

1. **Free Tier**: App sleeps after 15 min of inactivity. First request takes ~30 sec to wake up.

2. **OpenAI API Costs**: GPT-4o Vision API has usage costs. Check your OpenAI billing.

3. **Build Time**: First deployment takes 5-10 min (building React + installing Python deps)

---

## 🔧 Troubleshooting

**Build fails?**
- Check Render logs for errors
- Ensure all environment variables are set

**API not working?**
- Verify MONGO_URL is correct
- Check OPENAI_API_KEY is valid and has credits

**Frontend not loading?**
- Wait for full deployment to complete
- Check if static files were built correctly
