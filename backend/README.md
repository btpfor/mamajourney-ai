# MamaCare AI — Backend Cloudflare Workers + D1

API entièrement basée sur **Cloudflare Workers** et **Cloudflare D1** (binding `BD`).
Aucune dépendance à Supabase, Firebase, ou PostgreSQL.

## Stack

- Runtime : Cloudflare Workers (compatible Pages Functions)
- DB : Cloudflare D1 (SQLite) via le binding `env.BD`
- Auth : JWT HS256 + PBKDF2 (Web Crypto, zéro dépendance)
- Requêtes : **uniquement préparées et paramétrées** (`env.BD.prepare(...).bind(...)`)

## Arborescence

```
backend/
├── wrangler.toml             # Config Worker + binding D1 "BD"
├── migrations/
│   └── 0001_init.sql         # Schéma complet (users, pregnancies, appointments, ...)
├── src/
│   ├── index.ts              # Entrée Worker + routeur HTTP
│   ├── database.ts           # COUCHE UNIQUE de toutes les requêtes D1
│   ├── auth.ts               # Hash PBKDF2 + JWT HS256
│   ├── http.ts               # Helpers Response / CORS / JSON
│   ├── env.ts                # Types Env (binding BD, secrets)
│   └── routes/
│       ├── auth.ts           # /auth/signup, /signin, /signout, /reset
│       ├── users.ts          # /users/me, /users (admin)
│       ├── pregnancies.ts    # /pregnancies
│       ├── appointments.ts   # /appointments
│       ├── ultrasounds.ts    # /ultrasounds
│       ├── documents.ts      # /documents
│       ├── notifications.ts  # /notifications
│       ├── dashboard.ts      # /dashboard
│       └── admin.ts          # /admin/*
└── package.json
```

## Déploiement

```bash
cd backend
npm install

# 1. Créer (si pas déjà fait) la base D1
npx wrangler d1 create mamacare
# -> copier database_id dans wrangler.toml

# 2. Appliquer le schéma
npx wrangler d1 execute mamacare --remote --file=./migrations/0001_init.sql

# 3. Définir les secrets
npx wrangler secret put JWT_SECRET

# 4. Déployer
npx wrangler deploy
```

## Règles strictes respectées

- ✅ **Toutes** les requêtes passent par `src/database.ts`
- ✅ **Aucune** concaténation SQL — uniquement `.prepare(...).bind(...)`
- ✅ Compatible Cloudflare Pages Functions (le `fetch` handler est standard)
- ✅ Aucun import Supabase / Firebase / pg