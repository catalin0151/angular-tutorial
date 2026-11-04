# Backend — Express + Prisma + MySQL

Serves the real API for Chapters 09+. Written in TypeScript, uses Prisma against a local MySQL database.

---

## Fresh-install checklist

Follow these steps in order. Each step is runnable from the `backend/` folder unless noted.

### 1. Prerequisites

- **Node 20+** — check with `node --version`.
- **WAMP running** (green tray icon) with MySQL up.
- **An empty database** called `angular_tutorial` — create it via phpMyAdmin → New → database name → Create. Nothing inside it.

### 2. Install dependencies

```powershell
npm install
```

Downloads Prisma, Express, bcryptjs, jsonwebtoken, cors, dotenv, tsx, TypeScript. ~30–60s.

### 3. Create your `.env`

```powershell
copy .env.example .env
```

Then open `.env` and fill in:

```ini
# Default WAMP is root with no password on port 3306
DATABASE_URL="mysql://root:@localhost:3306/angular_tutorial"

# Any long random string. Paste from a password generator or mash the keyboard.
# Must stay the same between restarts or every existing login breaks.
JWT_SECRET="replace-me-with-a-long-random-string"

PORT=3000
```

`.env` is gitignored — safe to put secrets here.

### 4. Generate the Prisma client

```powershell
npx prisma generate
```

Reads `prisma/schema.prisma` and generates the typed TS client into `node_modules/@prisma/client`. **Re-run this after any schema change** (`npm run prisma:generate` is a shortcut).

Expected tail: `✔ Generated Prisma Client (vX.X.X) to .\node_modules\@prisma\client in XXXms`.

### 5. Run the migrations

```powershell
npx prisma migrate dev
```

Applies all migration files in `prisma/migrations/` to your database. On a fresh database this creates the `users` and `transactions` tables plus the `Role` and `TxStatus` enums.

If this is the very first time there are no migrations yet — Prisma will prompt for a name (`init` is fine) and generate the first one from the schema.

If Prisma asks "do you want to run seed after this" the first time, answer **no** — we run seed separately in the next step.

### 6. Seed demo data

```powershell
npm run seed
```

Runs `src/seed.ts`. **Idempotent** — wipes the tables and re-inserts clean data. Safe to re-run anytime your DB gets messy during exercises.

Creates:
- **3 users** (bcrypt-hashed passwords, 1-hour JWT expiry):
  - `alice@db.com` / `alice` → **admin**
  - `bob@db.com` / `bob` → user
  - `carlos@db.com` / `carlos` → user
- **120 transactions** across 4 accounts, 7 counterparties, 3 statuses.

Expected tail: `[seed] done — 3 users, 120 transactions`.

### 7. Start the server

```powershell
npm run dev
```

Starts with `tsx watch` — auto-reloads on any `.ts` save.

Expected: `[backend] listening on http://localhost:3000`.

### 8. Verify

In a second PowerShell window:

```powershell
# Health check
curl http://localhost:3000/api/health
# -> {"ok":true,"now":"..."}

# Log in to grab a token
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"alice@db.com\",\"password\":\"alice\"}"
# -> {"token":"...","user":{"email":"alice@db.com","name":"Alice","role":"admin"}}
```

If both work, the backend is ready for the Angular frontend to connect.

---

## Recipes for common situations

### "I pulled a new branch and the schema changed"

```powershell
npx prisma migrate dev     # applies any new migration files
npx prisma generate        # regenerates the client in case a model shape changed
npm run seed               # if seed.ts uses new fields, re-seed
```

### "My DB got messy during exercises, start over"

```powershell
npm run seed               # wipes + re-inserts cleanly
```

### "I want to look at the raw data in the DB"

```powershell
npx prisma studio          # opens a web UI on http://localhost:5555
```

Browse/edit tables visually. Better than phpMyAdmin for Prisma-managed data because it understands the schema.

### "I changed `schema.prisma` and want to apply it"

```powershell
npx prisma migrate dev --name describe_the_change
```

Generates a new migration file + applies it + regenerates the client. `--name` names the migration file (e.g. `--name add_user_bio`).

### "I need to wipe the DB entirely and start over"

```powershell
npx prisma migrate reset   # drops everything, re-runs all migrations, then runs seed automatically
```

Nuclear option. Use when migrations are out of sync or you want a totally fresh state.

---

## Project structure

```
backend/
├── package.json           # scripts + deps
├── tsconfig.json          # TS config, strict mode
├── .env.example           # template (committed)
├── .env                   # your secrets (gitignored)
├── prisma/
│   ├── schema.prisma      # source of truth for the DB schema
│   └── migrations/        # generated SQL migrations, commit these
└── src/
    ├── index.ts           # Express boot — mounts routers, CORS, 404 handler
    ├── db.ts              # single Prisma client instance
    ├── seed.ts            # demo data
    ├── middleware/
    │   └── auth.ts        # authRequired + requireRole middleware
    └── routes/
        ├── auth.ts        # POST /api/auth/login, GET /api/auth/me
        ├── transactions.ts # GET list/one, POST create
        └── admin.ts       # GET /api/admin/metrics (admin only)
```

## API surface

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET`  | `/api/health` | — | sanity check |
| `POST` | `/api/auth/login` | — | `{ email, password }` → `{ token, user }` |
| `GET`  | `/api/auth/me` | Bearer | current user |
| `GET`  | `/api/transactions` | Bearer | supports `?page=&size=&account=&status=&sort=&dir=` |
| `GET`  | `/api/transactions/:id` | Bearer | one transaction |
| `POST` | `/api/transactions` | Bearer | create new |
| `GET`  | `/api/admin/metrics` | Bearer + admin role | `{ users, transactions, uptime }` |

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start server with hot reload (`tsx watch`) |
| `npm start` | Start without watch mode |
| `npm run seed` | Wipe + re-insert demo data |
| `npm run prisma:generate` | Alias for `npx prisma generate` |
| `npm run prisma:migrate` | Alias for `npx prisma migrate dev` |
| `npm run prisma:studio` | Open Prisma Studio at `localhost:5555` |

## Troubleshooting

- **`ECONNREFUSED` on `npx prisma generate`** — MySQL isn't running. Start WAMP, check the tray icon is green.
- **`Access denied for user 'root'@'localhost'`** — your MySQL password doesn't match `.env`. Fix `DATABASE_URL`.
- **`Unknown database 'angular_tutorial'`** — you didn't create the empty database in phpMyAdmin. Create it, then re-run step 5.
- **Server starts but `/api/health` returns 404** — wrong port or wrong URL. Check the server log for the actual listening port.
- **JWT errors like `invalid signature` after restart** — you regenerated `JWT_SECRET`. All existing tokens are invalid. Clear `localStorage.ch15.auth` in the browser and log in again.
- **Prisma says "schema drift detected"** — the DB has tables that don't match migrations. Usually from manual changes. Fix with `npx prisma migrate reset` (wipes everything) OR fix the drift manually.
