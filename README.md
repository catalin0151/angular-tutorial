# Angular Crash Course — Luxoft / DB Prep

A hands-on, chapter-based tutorial repo built to take me from zero Angular to shipping features on a Deutsche Bank–style internal data tool. Lean & fast, modern Angular only (standalone components, signals, new control flow). Testing is deferred until the end; the focus is thinking in Angular.

## Repo layout

```
angular/
├── README.md          ← you are here
├── backend/           ← Node + Express + TypeScript + mysql2 (feeds chapters 9+)
└── frontend/          ← Angular 18 workspace, one folder per chapter under src/app/chapters/
```

## Prerequisites

| Tool          | Version    | Check                 |
|---------------|------------|-----------------------|
| Node.js       | 20+ or 22  | `node --version`      |
| npm           | 10+        | `npm --version`       |
| Angular CLI   | 20.x       | `ng version`          |
| MySQL (WAMP)  | 5.7+ / 8.x | runs via WAMP tray    |

## Running the project (once everything is scaffolded)

```powershell
# Terminal 1 — backend
cd backend
npm install
npm run dev          # http://localhost:3000

# Terminal 2 — frontend
cd frontend
npm install
npm start            # http://localhost:4200
```

Open http://localhost:4200 → the sidebar lists every chapter. Click one to load it.

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
| 09 | HttpClient & backend         | done (mock) |
| 10 | RxJS basics                  | done    |
| 11 | State with signals           | done    |
| 12 | UI with Tailwind             | pending |
| 13 | Data grid                    | pending |
| 14 | Dynamic reports              | pending |
| 15 | Auth, guards, interceptors   | pending |
| 16 | Performance                  | pending |
| 17 | Testing intro                | pending |

Every chapter folder contains its own `README.md` with:

1. **Theory** — concepts in plain English, what problem Angular is solving
2. **Why files are named/structured this way** — best practice vs. team preference
3. **React/Vue parallel** — only when it helps
4. **Walkthrough** — type this
5. **Exercises** — 2–4 tasks that test the chapter's rules, each with a self-check
6. **Common pitfalls** — only the ones you'll actually hit
