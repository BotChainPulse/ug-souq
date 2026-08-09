# Deployment notes for Railway

This file contains the minimal steps and environment variables required to deploy the `admin-dashboard-scaffold` branch to Railway.

1) Connect repository
- In Railway, add a new project (or open your existing project) and connect the GitHub repo: BotChainPulse/ug-souq
- Configure the service to auto-deploy from branch: `admin-dashboard-scaffold` (or merge the branch into `main` and deploy `main`).

2) Required Environment Variables (add under Project → Environments → Variables)
- ADMIN_KEY = Reagz
- DATABASE_URL = <your database connection string>   # required for backend DB access (MySQL/Postgres)
- (Optional for payouts) FLW_SECRET_KEY, FLW_CLIENT_ID, FLW_CLIENT_SECRET

3) Build & Start commands (Railway service settings)
- Build command: npm ci && npm run build
- Start command: npm run start

4) Node version
- Railway should use Node 18. We added a .nvmrc (18) to help. Alternatively set Node version in Railway service settings.

5) After deploy
- Open the deployed URL and visit /admin
- If the admin screen is blank, open Railway logs: Project → Services → select service → Logs
- Copy the failing build or runtime log and share it here; I will diagnose and fix it.

6) Quick local test
- git fetch origin && git checkout admin-dashboard-scaffold
- npm ci
- ADMIN_KEY=Reagz npm run build
- ADMIN_KEY=Reagz npm run start
- Visit http://localhost:3000/admin

7) Debug toolbar
- We added a small debug toolbar (visible in non-production mode or when you append `?admin_debug=1`) to set sessionStorage key quickly and open /admin.
- To show it on production temporarily, append `?admin_debug=1` to your site URL.

If you want I can also:
- push a small patch to fix any build errors (once you paste the Railway build logs), or
- add a GitHub Action to automatically build & report errors.

