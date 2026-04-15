---
name: qa-audit
description: Comprehensive QA/QC audit for SIROPE. Runs unit tests, build validation, browser smoke tests across all roles, security checks, accessibility review, CSS/design consistency, API contract verification, and database integrity checks. Use when you need a full quality gate before deployment or after significant changes.
---

# SIROPE QA/QC Audit Skill

You are a meticulous QA/QC engineer performing a comprehensive quality audit of SIROPE (Sistema de Registro Optativo de Participantes de Estudios). You must be **ruthless, thorough, and pedantic**. No defect escapes you.

Execute ALL passes in order. Record every finding. Produce a structured audit report at the end.

---

## PASS 0 — Environment Preflight

Before anything else, verify the development environment is functional.

1. **Check Node.js** is available: `node --version` (expect 20+)
2. **Check dependencies** are installed: verify `node_modules` exists and `package-lock.json` matches `package.json`
3. **Check database** exists and is accessible
4. **Check `.env`** has all required variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`)

If anything fails, fix it before proceeding. Use the `/local-dev` workflow if needed.

**Record:** ✅ or ❌ for each check.

---

## PASS 1 — Unit Tests (Automated)

Run ALL unit tests and record results:

```powershell
npx vitest run
```

**Record:**
- Total tests / Passed / Failed / Skipped
- Any failing test names and error messages
- Test execution time

**Severity:** Any test failure is a **BLOCKER** — do NOT proceed to Pass 5+ until unit tests pass.

---

## PASS 2 — Build Validation

Verify the production build succeeds cleanly:

```powershell
npm run build
```

**Check for:**
- Build completes without errors
- No TypeScript compilation errors
- No warnings about missing dependencies
- `output: "standalone"` generates `.next/standalone/` directory
- Static assets in `.next/static/` are generated

**Record:** Build time, any warnings, pass/fail.

**Severity:** Build failure is a **BLOCKER**.

---

## PASS 3 — Linting & TypeScript Strictness

```powershell
npm run lint
```

**Check:**
- Zero ESLint errors (warnings are acceptable but should be noted)
- No `any` type usage in server actions (`src/app/actions/*.ts`)
- No `// @ts-ignore` or `// @ts-expect-error` without justification
- No `console.log` left in production code (only `console.error` in catch blocks is OK)

**Record:** Error count, warning count, files with issues.

---

## PASS 4 — Security Audit

### 4a. Dependency Vulnerabilities
```powershell
npm audit
```
Record: critical/high/moderate/low counts.

### 4b. Environment & Secrets
- [ ] `.env` is in `.gitignore`
- [ ] `.env.local`, `.env.*.local` are in `.gitignore`
- [ ] `NEXTAUTH_SECRET` is not the default value from `.env.example`
- [ ] No hardcoded secrets/passwords in source code (grep for patterns like `password`, `secret`, `token`, `api_key` in `src/`)
- [ ] No hardcoded database paths that could leak

### 4c. Authentication & Authorization
- [ ] All server actions in `src/app/actions/` check session/role before performing mutations
- [ ] API routes in `src/app/api/` validate authentication
- [ ] Middleware (`src/middleware.ts`) protects dashboard routes
- [ ] No route can be accessed without valid session (except `/login`, `/about`, `/api/auth/*`)
- [ ] Role-based access: verify ADMIN actions reject STUDENT/PROFESSOR sessions

### 4d. Input Validation
- [ ] All server actions use Zod schemas from `src/lib/validations.ts`
- [ ] No raw SQL or string interpolation in database queries
- [ ] File uploads (if any) have type/size validation

### 4e. Rate Limiting
- [ ] Login endpoint has rate limiting (`src/lib/rate-limit.ts`)
- [ ] API endpoints have appropriate limits

**Severity:** Any critical vulnerability is a **BLOCKER**. Missing auth checks are **CRITICAL**.

---

## PASS 5 — Browser Smoke Tests (Visual + Functional)

Start the dev server (`npm run dev`), then test each user role in the browser using the browser tool.

### Test Credentials
Use the seed data credentials. Default passwords are `Sirope2026!` (basic seed) or `Demo2026!` (demo seed). Check the seed files in `prisma/seed.ts` and `prisma/seed-demo.ts` for exact emails.

### 5a. Login Page (`/login`)
- [ ] Page loads without errors
- [ ] Institutional logo (escudo) renders correctly
- [ ] "SIROPE" title and "UNIVERSIDAD DE COSTA RICA" subtitle visible
- [ ] Email and password fields present with icons
- [ ] "Iniciar Sesión" button present and styled with UCR gradient
- [ ] Invalid credentials show error banner with shake animation
- [ ] Successful login redirects to role-appropriate dashboard
- [ ] Page is responsive (test at 768px and 480px widths)

### 5b. Professor Dashboard (`/profesor`)
- [ ] Login as professor → redirected to `/profesor`
- [ ] Sidebar shows: Dashboard, Mis Cursos, Mis Estudiantes
- [ ] Sidebar logo shows institutional escudo
- [ ] Sidebar brand says "SIROPE"
- [ ] Stats cards render (courses count, students count, credits)
- [ ] Course table renders with data
- [ ] Sidebar collapse/expand works
- [ ] Notification bell present

### 5c. Researcher Dashboard (`/investigador`)
- [ ] Login as researcher → redirected to `/investigador`
- [ ] Sidebar shows: Dashboard, Mis Estudios, Nuevo Estudio
- [ ] Study cards/list renders
- [ ] Study status badges display correctly
- [ ] Navigation between study pages works

### 5d. Student Dashboard (`/estudiante`)
- [ ] Login as student → redirected to `/estudiante`
- [ ] Sidebar shows: Dashboard, Estudios Disponibles, Mi Historial
- [ ] Available studies list renders
- [ ] Credit balance visible

### 5e. Admin Dashboard (`/admin`)
- [ ] Login as admin → redirected to `/admin`
- [ ] All sidebar sections visible: General, Gestión, Operaciones, Sistema
- [ ] User management pages load
- [ ] Semester management works
- [ ] Approval queue renders
- [ ] Audit log loads
- [ ] Analytics page renders
- [ ] Configuration page loads

### 5f. Cross-Role Protection
- [ ] As student, navigating to `/admin` → redirected or forbidden
- [ ] As professor, navigating to `/investigador` → redirected or forbidden
- [ ] Unauthenticated user accessing `/profesor` → redirected to login

### 5g. Responsive Design
For each dashboard, resize browser to:
- [ ] 1920px (desktop) — full sidebar visible
- [ ] 1024px (tablet) — layout still functional
- [ ] 768px (mobile) — sidebar becomes hamburger menu, mobile header visible
- [ ] 480px (small mobile) — all content still accessible

**Record:** Screenshots for each test. Note any visual glitches, broken layouts, missing data.

---

## PASS 6 — CSS & Design Consistency (UCR Palette)

Verify the UCR Pantone institutional palette is applied consistently.

### 6a. Color Token Verification
Open `src/app/globals.css` and verify:
- [ ] `--bg-deepest` through `--bg-surface` use Azul UCR (#005da4) derived blues
- [ ] `--celeste-500` is `#00c0f3` (Pantone 298C)
- [ ] `--oro-500` is `#ffe06a` (Pantone 121C)
- [ ] `--gradient-primary` starts from `#005da4`

### 6b. Hardcoded Color Scan
Search for any remaining hardcoded colors that don't use CSS variables:
```powershell
# Search for raw hex colors in TSX/CSS files (excluding globals.css token definitions)
rg "#[0-9a-fA-F]{6}" --include "*.tsx" --include "*.css" src/
```

Acceptable: colors in `globals.css` `:root`, semantic colors like `#fff`, `white`.
Unacceptable: random hex values like `#4a5568` or `#e2e8f0` that bypass the design system.

### 6c. Font Verification
- [ ] Display font (`DM Serif Display`) loads correctly
- [ ] Body font (`Satoshi`) loads correctly
- [ ] No fallback system fonts visible (no Arial/Helvetica rendering)

### 6d. Component Visual Consistency
- [ ] Buttons use `btn-primary`, `btn-secondary`, etc. classes
- [ ] Cards use `card`, `card-interactive`, or `card-glass` classes
- [ ] Badges use `badge-*` classes
- [ ] Tables use `table` class with proper styling
- [ ] Form inputs use `form-input`, `form-select`, `form-textarea`

---

## PASS 7 — Database & Data Integrity

### 7a. Schema Validation
```powershell
npx prisma validate
```

### 7b. Seed Data Consistency
- [ ] `prisma/seed.ts` creates all required user roles (ADMIN, RESEARCHER, PROFESSOR, STUDENT)
- [ ] `prisma/seed-demo.ts` creates a richer dataset
- [ ] Seed scripts are idempotent (running twice doesn't crash)
- [ ] All required relationships are established (courses → professors, students → enrollments, etc.)

### 7c. Migration Safety
- [ ] `npx prisma db push` runs without errors on a fresh database
- [ ] No data-loss warnings from Prisma

---

## PASS 8 — API Contract Verification

For each API route in `src/app/api/`, verify:

### 8a. Authentication Endpoints (`/api/auth/[...nextauth]`)
- [ ] POST login returns session on valid credentials
- [ ] POST login returns 401-equivalent on invalid credentials
- [ ] GET session returns user data for authenticated requests

### 8b. Admin Endpoints (`/api/admin/`)
- [ ] All endpoints verify ADMIN role
- [ ] Return proper error codes (401, 403, 422, 500)
- [ ] Use consistent JSON response shape

### 8c. Other Endpoints
- [ ] `/api/notifications` returns user-specific notifications
- [ ] `/api/course-students` returns appropriate data
- [ ] `/api/cron/*` endpoints (if any) have proper security

---

## PASS 9 — Accessibility Basics

For each major page, check:
- [ ] All images have `alt` text
- [ ] Form inputs have associated labels or `aria-label`
- [ ] Interactive elements are keyboard-navigable (`tabindex`, `:focus-visible`)
- [ ] Color contrast: text on dark backgrounds meets WCAG AA (4.5:1 for normal text)
- [ ] No content visible only via color (colorblind safety)
- [ ] Buttons have descriptive text (not just icons without labels)

---

## PASS 10 — Docker & Deployment Readiness

### 10a. Dockerfile Validation
- [ ] `Dockerfile` syntax is valid
- [ ] Multi-stage build preserves only needed files in runtime stage
- [ ] `entrypoint.sh` handles first-run initialization (db push + seed)
- [ ] Non-root user (`nextjs`) is used in runtime stage

### 10b. Docker Compose
- [ ] `docker-compose.yml` maps port 3000
- [ ] Volume `sirope-data` is defined for persistence
- [ ] Healthcheck is configured
- [ ] `SEED_ON_INIT` defaults to `true`

### 10c. .dockerignore
- [ ] `node_modules`, `.next`, `.git`, `.env`, test files are excluded
- [ ] `README.md` is NOT excluded (useful for documentation)

---

## Audit Report Format

After completing ALL passes, produce a structured artifact report at:
`<artifact_dir>/qa_audit_report.md`

Use this format:

```markdown
# 🔍 SIROPE QA/QC Audit Report

**Date:** YYYY-MM-DD HH:MM
**Auditor:** AI QA Agent
**Commit/Version:** (if available)

## Executive Summary
- **Overall Verdict:** ✅ PASS / ⚠️ PASS WITH WARNINGS / ❌ FAIL
- **Blockers:** N
- **Critical:** N
- **Warnings:** N
- **Info:** N

## Pass Results

### Pass 0 — Environment ✅/❌
(details)

### Pass 1 — Unit Tests ✅/❌
(details with counts)

... (all passes)

## Findings Table

| # | Severity | Pass | Description | File | Recommendation |
|---|----------|------|-------------|------|----------------|
| 1 | BLOCKER  | 1    | ...         | ...  | ...            |

## Screenshots
(embed relevant screenshots from browser tests)

## Recommendations
(prioritized list of fixes)
```

### Severity Levels:
- **BLOCKER**: Must fix before deployment. Build failures, test failures, security holes.
- **CRITICAL**: Should fix before deployment. Missing auth checks, data integrity issues.
- **WARNING**: Should fix soon. UI glitches, accessibility issues, inconsistent patterns.
- **INFO**: Nice to fix. Minor style issues, optimization opportunities.

---

## Execution Rules

1. **Run EVERY pass** — do not skip any.
2. **Take screenshots** during browser tests — embed them in the report.
3. **Be brutally honest** — if something is broken, say it. Do not sugarcoat.
4. **Fix nothing** during the audit — only observe and report. Fixing is a separate step after the report is reviewed.
5. **If a BLOCKER is found**, note it prominently but continue the audit to find ALL issues.
6. **Time-box browser tests** to 3 minutes per role — focus on critical paths.
