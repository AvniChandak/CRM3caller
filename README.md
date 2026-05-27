# LeadFlow CRM — Coaching & Business Lead Management System

A secure, real-time AI-powered CRM designed for coaching businesses to manage, route, and audit customer leads. It includes dual dashboard environments (Admin and Caller), automated round-robin lead distribution, strict data access filtering, and instant synchronization.

---

## 📂 Project Folder Structure

```text
crm-coaching/
├── database/
│   └── schema.sql              # Supabase PostgreSQL tables, triggers, and indices
├── backend/
│   ├── .env.example            # Backend environmental template
│   ├── package.json            # Node.js configurations and dependencies
│   ├── supabase.js             # Supabase Client initialization (service role)
│   ├── seed.js                 # Database seed script for admins & 3 callers
│   └── server.js               # Express application (auth, routing, SSE engine)
└── frontend/
    ├── .env.example            # Frontend environmental template
    ├── index.html              # Core application entry (optimized for SEO)
    ├── vite.config.js          # Vite and Tailwind CSS v4 compiler settings
    ├── package.json            # React & Vite packages
    └── src/
        ├── index.css           # Tailwind v4 import & custom glass styling
        ├── main.jsx            # React root mount script
        ├── App.jsx             # Core router and SSE event sync receiver
        ├── context/
        │   ├── AuthContext.jsx # User sessions and active profile sync
        │   └── ThemeContext.jsx# Light / Dark theme toggles
        └── components/
            ├── Login.jsx       # Premium login interface
            ├── Sidebar.jsx     # Role-filtered side navigation bar
            ├── AdminDashboard.jsx # Company metrics and caller performance tables
            ├── CallerDashboard.jsx# Individual roster metrics & calendar reminders
            ├── LeadsView.jsx   # Searchable leads grid, csv export & import wizard
            ├── UsersView.jsx   # Admin caller panel (active/inactive state toggle)
            └── LeadModal.jsx   # Notes timeline, audit logs & field updates
```

---

## 🛠️ Step 1: Database Setup (Supabase)

1. Open your **Supabase Dashboard** and navigate to your project.
2. Click on the **SQL Editor** in the left sidebar.
3. Click **New Query**, paste the contents of [schema.sql](file:///C:/Users/chand/.gemini/antigravity/scratch/crm-coaching/database/schema.sql), and click **Run**.
   * *This will create the `users`, `leads`, and `activities` tables.*
   * *It installs a Postgres Trigger function `enforce_caller_limit` which strictly restricts caller counts in the database to exactly 3.*

---

## ⚙️ Step 2: Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file by copying the template:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in your Supabase connection parameters:
   * `PORT=5000`
   * `SUPABASE_URL`: Find this in Supabase project Settings -> API.
   * `SUPABASE_ANON_KEY`: Find this in Supabase project Settings -> API.
   * `SUPABASE_SERVICE_ROLE_KEY`: Service role key (required to manage auth users and bypass default RLS).

4. **Seed the database** with the Admin and Caller accounts:
   ```bash
   node seed.js
   ```
   * *This will create the test users in Supabase Auth and insert them into the `public.users` table.*
   * *It also seeds 6 sample leads distributed round-robin among the callers.*

5. **Start the backend development server**:
   ```bash
   npm run dev
   ```
   * *The Express API server will start on `http://localhost:5000`.*

---

## 💻 Step 3: Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Create a `.env` file by copying the template:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and update the parameters:
   * `VITE_SUPABASE_URL`: Your Supabase URL.
   * `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
   * `VITE_API_URL=http://localhost:5000/api`

4. **Start the frontend application**:
   ```bash
   npm run dev
   ```
   * *Open your browser to `http://localhost:5173`.*

---

## 👥 Sample Test Users

Use the following seeded accounts to verify the dual dashboard environments:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@crm.com` | `AdminPassword123!` | Sees all metrics, revenue, caller performance charts, reassigns callers. |
| **Caller 1** | `caller1@crm.com` | `CallerPassword123!` | Sees only leads assigned to Caller 1. Revenue hidden. |
| **Caller 2** | `caller2@crm.com` | `CallerPassword123!` | Sees only leads assigned to Caller 2. Revenue hidden. |
| **Caller 3** | `caller3@crm.com` | `CallerPassword123!` | Sees only leads assigned to Caller 3. Revenue hidden. |

---

## 🔒 Security Operations

1. **Revenue Protection**: API endpoints strip the `revenue` field before responding to sales caller accounts. Callers attempting to update revenue or assignments via PUT will receive a `403 Forbidden` response.
2. **Access Isolation**: Backend queries automatically inject `WHERE assigned_to = caller_id` conditions for caller requests, preventing data leakage.
3. **Trigger Validation**: The database throws a PG-14 exception if more than 3 caller accounts are added.

---

## 🚀 Deployment Instructions

### Frontend (Vercel)
1. Install Vercel CLI or import the frontend directory to your Vercel Dashboard.
2. Set the build command to `npm run build` and output directory to `dist`.
3. Add environment variables:
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
   * `VITE_API_URL` (Points to the deployed Render/Railway backend URL)

### Backend (Render / Railway)
1. Deploy the backend directory to Render Web Service or Railway.
2. Set the start command to `node server.js`.
3. Add environment variables in settings:
   * `PORT`
   * `SUPABASE_URL`
   * `SUPABASE_SERVICE_ROLE_KEY`
