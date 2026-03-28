---
description: How to run SIROPE locally for development and testing
---

# Run SIROPE Locally

## Prerequisites
- Node.js 20+ (`node --version`)
- npm 10+ (`npm --version`)

## Setup (first time only)

// turbo-all

1. Install dependencies
```powershell
npm install
```

2. Copy environment file (if `.env` doesn't exist)
```powershell
copy .env.example .env
```

3. Generate Prisma client
```powershell
npx prisma generate
```

4. Create database tables
```powershell
npx prisma db push
```

5. Seed the database (choose one):
   - Basic seed (6 users, password `Sirope2026!`): `npm run seed`
   - Demo seed (15+ users, password `Demo2026!`): `npm run seed:demo`

## Run Development Server

6. Start the dev server
```powershell
npm run dev
```
→ Open http://localhost:3000

## Run Tests

7. Run all 398 unit tests
```powershell
npx vitest run
```

## Reset Database

8. Delete and recreate
```powershell
del dev.db
npx prisma db push
npm run seed:demo
```
