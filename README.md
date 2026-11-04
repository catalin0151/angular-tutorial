# Angular Crash Course — Luxoft / DB Prep

A hands-on, chapter-based tutorial repo built to take me from zero Angular to shipping features on a Deutsche Bank–style internal data tool. Lean & fast, modern Angular only (standalone components, signals, new control flow). Testing is deferred until the end; the focus is thinking in Angular.

## Repo layout

```
angular/
├── README.md          ← you are here
├── backend/           ← Node + Express + TypeScript + Prisma + MySQL
└── frontend/          ← Angular 20 workspace, one folder per chapter under src/app/chapters/
```

## Prerequisites

| Tool          | Version    | Check                 |
|---------------|------------|-----------------------|
| Node.js       | 20+ or 22  | `node --version`      |
| npm           | 10+        | `npm --version`       |
| Angular CLI   | 20.x       | `ng version`          |
| MySQL (WAMP)  | 5.7+ / 8.x | runs via WAMP tray    |

---

## Running the full stack — step by step

The stack has three moving pieces: **MySQL (WAMP)**, the **backend (Node/Express/Prisma)**, and the **frontend (Angular)**. Chapters 01–08 need only the frontend. Chapters 09+ need everything.

### One-time setup

```powershell
# 1. Make sure WAMP is running (green tray icon) and MySQL is up.
#    Create an empty database called `angular_tutorial` (via phpMyAdmin or the WAMP MySQL console).

# 2. Backend
cd backend
npm install                 # downloads Prisma, Express, bcrypt, jsonwebtoken, etc.
copy .env.example .env      # then edit .env with your MySQL password + a JWT secret
npx prisma migrate dev      # creates the users and transactions tables
npm run seed                # inserts 3 demo users and 120 transactions

# 3. Frontend
cd ..\frontend
npm install                 # one-time download of Angular + friends
```

### Everyday startup

```powershell
# Terminal 1 — backend
cd backend
npm run dev                 # http://localhost:3000, auto-reloads on save

# Terminal 2 — frontend
cd frontend
npm start                   # http://localhost:4200, auto-reloads on save
```

Open http://localhost:4200 → the sidebar lists every chapter. Chapters 09, 10, 11, 13, 15 are gated with `authGuard` — they bounce you to Chapter 15's login screen if you aren't logged in. Log in as **alice@db.com** / `alice` for admin access, or Bob / Carlos (password = name) for regular user access.

### Verifying the backend

```powershell
curl http://localhost:3000/api/health
# -> {"ok":true,"now":"..."}

# Log in to grab a token
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"alice@db.com\",\"password\":\"alice\"}"
# -> {"token":"...","user":{...}}
```

### Which chapters need what

| Chapters | Needs backend? | Needs login? |
|---|---|---|
| 01 – 08 | no | no |
| 09, 10, 11, 13 | **yes** | **yes** (gated with authGuard) |
| 15 | **yes** | no (it IS the login) |
| Others (12, 14, 16, 17) | not yet implemented | — |

---

## Chapter index

| #  | Chapter                      | Status  |
|----|------------------------------|---------|
| 01 | Hello Angular                | done    |
| 02 | Components & templates       | done    |
| 03 | Binding & signals            | done    |
| 04 | Directives & pipes           | done    |
| 05 | Services & DI                | done    |
| 06 | Routing                      | done    |
| 07 | Template-driven forms        | done    |
| 08 | Reactive forms               | done    |
| 09 | HttpClient & backend         | done    |
| 10 | RxJS basics                  | done    |
| 11 | State with signals           | done    |
| 12 | UI with Tailwind             | skipped |
| 13 | Data grid                    | done    |
| 14 | Dynamic reports              | skipped |
| 15 | Auth, guards, interceptors   | done    |
| 16 | Performance                  | pending |
| 17 | Testing intro                | pending |

Every chapter folder contains its own `README.md` with:

1. **Theory** — concepts in plain English, what problem Angular is solving
2. **Why files are named/structured this way** — best practice vs. team preference
3. **React/Vue parallel** — only when it helps
4. **Walkthrough** — type this
5. **Exercises** — 2–4 tasks that test the chapter's rules, each with a self-check
6. **Common pitfalls** — only the ones you'll actually hit
