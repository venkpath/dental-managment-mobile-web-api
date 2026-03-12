# Free Deployment Guide — Dental Management App

Deploy your full-stack dental app (NestJS + Next.js + PostgreSQL + Redis) **100% free**.

| Component | Provider | Free Tier |
|---|---|---|
| PostgreSQL | [Neon](https://neon.tech) | 0.5 GB storage, always-on |
| Redis | [Upstash](https://upstash.com) | 10K commands/day |
| Backend (NestJS) | [Render](https://render.com) | 750 hours/month (sleeps after 15 min idle) |
| Frontend (Next.js) | [Vercel](https://vercel.com) | Unlimited for hobby projects |

---

## Step 1: Set Up PostgreSQL (Neon)

1. Go to [neon.tech](https://neon.tech) and sign up (GitHub login works)
2. Click **"New Project"** → name it `dental-saas`
3. Choose the closest region to your users
4. Once created, go to the **Dashboard** → **Connection Details**
5. Copy **two** connection strings:
   - **Pooled connection string** (for your app at runtime) → this is your `DATABASE_URL`
   - **Direct connection string** (for migrations) → this is your `DIRECT_DATABASE_URL`

   They look like:
   ```
   # Pooled (DATABASE_URL) — uses -pooler in the hostname
   postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require

   # Direct (DIRECT_DATABASE_URL) — no -pooler
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

> Save both — you'll need them in Step 4.

---

## Step 2: Set Up Redis (Upstash)

1. Go to [upstash.com](https://upstash.com) and sign up
2. Click **"Create Database"** → name it `dental-redis`
3. Choose the closest region
4. Once created, go to **Details** and copy:
   - **Endpoint** (host) → e.g. `usw1-random-12345.upstash.io`
   - **Port** → `6379`
   - **Password** → your Redis password

> Upstash uses TLS by default. The connection details are needed in Step 4.

---

## Step 3: Push Code to GitHub

Make sure your code is in a **GitHub repo** (both `dental-backend/` and `dental-frontend/` folders).

```bash
git add .
git commit -m "Add deployment config"
git push origin main
```

---

## Step 4: Deploy Backend on Render

1. Go to [render.com](https://render.com) and sign up (GitHub login works)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure the service:

   | Setting | Value |
   |---|---|
   | **Name** | `dental-backend` |
   | **Region** | Same region as Neon |
   | **Root Directory** | `dental-backend` |
   | **Runtime** | `Docker` |
   | **Instance Type** | `Free` |

5. Add these **Environment Variables** (click "Add Environment Variable"):

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `3000` |
   | `DATABASE_URL` | *(Neon pooled connection string from Step 1)* |
   | `DIRECT_DATABASE_URL` | *(Neon direct connection string from Step 1)* |
   | `REDIS_HOST` | *(Upstash endpoint from Step 2)* |
   | `REDIS_PORT` | `6379` |
   | `REDIS_PASSWORD` | *(Upstash password from Step 2)* |
   | `REDIS_TLS` | `true` |
   | `JWT_SECRET` | *(generate a strong random string — e.g. run `openssl rand -hex 32`)* |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CORS_ORIGIN` | *(will fill after Vercel deploy — e.g. `https://dental-frontend.vercel.app`)* |

6. Click **"Create Web Service"**
7. Wait for the build to complete. Your backend URL will be something like:
   `https://dental-backend-xxxx.onrender.com`

> **Note:** Free tier services sleep after 15 minutes of inactivity. First request after sleep takes ~30 seconds to wake up.

---

## Step 5: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (GitHub login)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repo
4. Configure:

   | Setting | Value |
   |---|---|
   | **Root Directory** | `dental-frontend` |
   | **Framework Preset** | Next.js (auto-detected) |

5. Add this **Environment Variable**:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_BASE_URL` | `https://dental-backend-xxxx.onrender.com/api/v1` |

   *(Replace with your actual Render backend URL from Step 4)*

6. Click **"Deploy"**
7. Your frontend URL will be something like: `https://dental-frontend.vercel.app`

---

## Step 6: Update CORS on Render

Go back to your Render backend service → **Environment** → update:

| Key | Value |
|---|---|
| `CORS_ORIGIN` | `https://your-app-name.vercel.app` |

*(Use your actual Vercel URL from Step 5)*

Render will automatically redeploy with the new variable.

---

## Step 7: Run Database Seed (Optional)

If you want to seed initial data (plans, features, super admin), you can run it from the Render **Shell**:

1. Go to your Render backend service → **Shell** tab
2. Run:
   ```bash
   npx prisma db seed
   ```

---

## Verify Everything Works

1. **Backend health check:** Visit `https://your-backend.onrender.com/api/v1/health`
2. **Frontend:** Visit your Vercel URL
3. **API docs:** Visit `https://your-backend.onrender.com/api/v1/docs` (Swagger)

---

## Troubleshooting

### Backend won't start
- Check Render **Logs** tab for errors
- Verify all environment variables are set correctly
- Make sure `DATABASE_URL` has `?sslmode=require`

### Database connection errors
- Neon requires SSL — ensure your connection string has `?sslmode=require`
- Check that both `DATABASE_URL` and `DIRECT_DATABASE_URL` are set

### Redis connection errors
- Upstash uses TLS by default on port `6379`
- If your app needs a Redis password, you may need to update the Redis config to include authentication

### Frontend can't reach backend
- Check `NEXT_PUBLIC_API_BASE_URL` is set correctly on Vercel
- Check `CORS_ORIGIN` on Render matches your Vercel domain exactly
- After changing env vars on Vercel, redeploy the frontend

### Slow first load
- Free Render services sleep after 15 min idle. The first request wakes them up (~30s cold start)
- Consider using [UptimeRobot](https://uptimerobot.com) (free) to ping your backend every 14 minutes to keep it awake

---

## Cost Summary

| Service | Monthly Cost |
|---|---|
| Neon (PostgreSQL) | **$0** |
| Upstash (Redis) | **$0** |
| Render (Backend) | **$0** |
| Vercel (Frontend) | **$0** |
| **Total** | **$0/month** |

---

## Upgrading Later

When you're ready to scale:
- **Neon** → Pro plan ($19/mo) for more storage and compute
- **Upstash** → Pay-as-you-go ($0.2 per 100K commands)
- **Render** → Starter ($7/mo) for always-on, faster builds
- **Vercel** → Pro ($20/mo) for team features and more bandwidth


## backend: https://dental-backend-rl1u.onrender.com

Deployment
dental-frontend-7kd2gf5j9-venkpaths-projects.vercel.app
Domains
dental-frontend-alpha.vercel.app
Status
Ready
Created
1m ago by venkpath

github/venkpath
Source
master
dfeccef
landing page