# Deployment

Vektra has two deployment targets, and they are intentionally different. This
document covers both, the environment variables they expect, and how to roll
back or troubleshoot. For the bigger picture see
[architecture.md](./architecture.md).

---

## Targets at a glance

| | Docker Compose | Render (free tier) |
| --- | --- | --- |
| Used for | local dev, self-hosting | staging / demos |
| Edge proxy | Nginx (in repo) | none — one domain per service |
| Browser → API path | `/api/*` (Nginx) | `/spring-api/*` (Next.js rewrite) |
| Database | `mysql:8.4` container, volume `mysql_data` | external Clever Cloud MySQL |
| Public URL | `http://localhost` | `vektra-{web,admin,factory,backend}.onrender.com` |
| Cold starts | none | ~30–60 s after 15 min idle |
| Defined in | [`vektra/docker-compose.yml`](../vektra/docker-compose.yml) | [`render.yaml`](../render.yaml) |

Why no Nginx on Render? The free tier has no shared edge, so each service
gets its own `*.onrender.com` URL. Nginx would have nothing to proxy in front
of and no single domain to terminate TLS on. The Next.js `rewrites()` in
[`apps/web/next.config.mjs`](../apps/web/next.config.mjs) takes its place by
forwarding `/spring-api/*` server-side to the backend.

---

## Deploying with Docker Compose

### Steps

```bash
git clone <repo-url>
cd vektra_app/vektra
docker compose up -d --build
```

First boot takes ~30–60 seconds because `backend` waits for `mysql` to pass
its healthcheck. Once it's up:

- Public site: <http://localhost/>
- Admin: <http://localhost/admin>
- Factory: <http://localhost/factory>
- API (through Nginx): <http://localhost/api/v3/api-docs>
- MySQL from a host tool: `localhost:3308` (user `root`, password `root`,
  db `vektra`)

### What happens behind the scenes

1. Nginx, MySQL, web, admin, factory, and backend images are built or pulled.
2. MySQL starts and runs its healthcheck (`mysqladmin ping`) every 5 s.
3. Once MySQL is `healthy`, `backend` starts (Spring auto-creates the schema
   thanks to `createDatabaseIfNotExist=true` in the JDBC URL).
4. `web`, `admin`, and `factory` start in parallel; they only need `backend` to be
   started, not healthy.
5. Nginx starts last and begins routing on port 80.

### Rebuilding a single service

```bash
docker compose up -d --build backend
```

### Stopping

```bash
docker compose down       # stop + remove containers, KEEP DB volume
docker compose down -v    # also delete the mysql_data volume — destroys data
```

---

## Deploying to Render

Render is configured as a Blueprint via [`render.yaml`](../render.yaml). It
deploys **four Docker services** — `vektra-backend`, `vektra-web`,
`vektra-admin`, and `vektra-factory`. There is no `nginx` service and no `mysql` service: Render's
free tier doesn't run a shared edge proxy, and the database lives outside
Render entirely.

### One-time setup

1. **Provision an external MySQL.** The recommended free option (called out
   in `render.yaml`'s comments) is Clever Cloud's MySQL DEV add-on.
2. **Connect the GitHub repo** in the Render dashboard and choose
   "Blueprint" deploy pointing at `render.yaml`. Render will create the
   four services automatically.
3. **Set secrets on `vektra-backend`** (these have `sync: false` in
   `render.yaml`, meaning they are *not* committed to git and must be set in
   the dashboard):
   - `SPRING_DATASOURCE_URL` — full JDBC URL to your Clever Cloud DB
   - `SPRING_DATASOURCE_USERNAME`
   - `SPRING_DATASOURCE_PASSWORD`
4. **Set `BACKEND_URL` on `vektra-web`, `vektra-admin`, and `vektra-factory`**
   to the backend's public URL (e.g. `https://vektra-backend.onrender.com`).
   Trigger a redeploy on each — `BACKEND_URL` is consumed as a Docker `ARG`,
   so it is baked into the JS bundle at build time and only changes after a
   rebuild.

### Health checks

Render pings these paths to know each service is up:

| Service          | Health check path     |
| ---------------- | --------------------- |
| `vektra-backend` | `/api/v3/api-docs`    |
| `vektra-web`     | `/`                   |
| `vektra-admin`   | `/admin`              |
| `vektra-factory` | `/factory`            |

### Cold starts

Free-tier services sleep after ~15 minutes of idle. The first request after
sleep takes ~30–60 seconds while the container boots. This is expected on
free tier — you can warm them up with a periodic ping if it matters for a
demo.

---

## Environment variables reference

| Variable                       | Service(s)         | Stage                                | Example                                                                                          | Notes                                                                                  |
| ------------------------------ | ------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `BACKEND_URL`                  | `web`, `admin`, `factory` | **Both** (Dockerfile `ARG` + `ENV`)  | `http://backend:8080` (Compose) / `https://vektra-backend.onrender.com` (Render)                 | Used by `next.config.mjs` rewrite. Build-time use means changes require a rebuild.     |
| `NEXT_PUBLIC_API_URL`          | `web`, `admin`, `factory` | **Build-time only**                  | `/api` (Compose) / `/spring-api` (Render default)                                                | Baked into the JS bundle at build. Browser uses this prefix to call the API.           |
| `SPRING_DATASOURCE_URL`        | `backend`          | Runtime                              | `jdbc:mysql://mysql:3306/vektra?createDatabaseIfNotExist=true&useSSL=false&...`                  | Falls back to `localhost:3306` if unset (see `application.properties`).                |
| `SPRING_DATASOURCE_USERNAME`   | `backend`          | Runtime                              | `root`                                                                                           | Set in compose; `sync: false` secret on Render.                                        |
| `SPRING_DATASOURCE_PASSWORD`   | `backend`          | Runtime                              | `root`                                                                                           | Same.                                                                                  |
| `MYSQL_DATABASE`               | `mysql`            | Runtime (init only)                  | `vektra`                                                                                         | Used only on first container start to seed the DB.                                     |
| `MYSQL_ROOT_PASSWORD`          | `mysql`            | Runtime (init only)                  | `root`                                                                                           | Required by the official mysql image.                                                  |

The "Stage" column is the part most newcomers get wrong: anything starting
with `NEXT_PUBLIC_` (and `BACKEND_URL` when used as `ARG`) is **build-time**
and only changes after a rebuild. The Spring datasource variables are
**runtime** — restart the backend and they take effect.

---

## Database migrations

The backend uses `spring.jpa.hibernate.ddl-auto: update` for convenience, but
that is **not enough** for every schema change — especially widening a MySQL
`ENUM` column when new Java enum values are added. Staging and production
(Clever Cloud MySQL) need **manual SQL** when a migration file is added under
[`vektra/scripts/migrations/`](../vektra/scripts/migrations/).

### When to run a migration

| Environment | Who applies migrations |
| ----------- | ---------------------- |
| **Docker Compose (fresh)** | Usually automatic — empty DB is created with the current entity model |
| **Clever Cloud / long-lived DB** | Run each `.sql` file in the Clever Cloud MySQL console (or CLI) **before** or **right after** deploying code that depends on it |

Apply migrations in numeric order (`001`, `002`, …). No backend restart is
required for DDL-only changes; retry the failing API call after the SQL
commits.

### Migration 001 — transfer types (required for peer-to-peer transfers)

If transfers return **500** and backend logs show:

```text
Data truncated for column 'type' at row 1
```

the `transactions.type` column is still an old `ENUM('EARN','SPEND')` and
rejects `TRANSFER_IN` / `TRANSFER_OUT`.

**Fix:** run
[`vektra/scripts/migrations/001_transactions_type_varchar.sql`](../vektra/scripts/migrations/001_transactions_type_varchar.sql)
against the Clever Cloud database:

```sql
ALTER TABLE transactions
  MODIFY COLUMN type VARCHAR(20) NOT NULL;
```

**Verify:**

```sql
SHOW COLUMNS FROM transactions LIKE 'type';
-- Type should be varchar(20)

SELECT id, user_id, type, amount, transfer_id
FROM transactions
WHERE type IN ('TRANSFER_OUT', 'TRANSFER_IN')
ORDER BY created_at DESC
LIMIT 5;
```

Then retry a transfer from the wallet UI — no redeploy needed.

### Migration 002 — store catalog + purchases (required for Shop / Factory)

Run
[`vektra/scripts/migrations/002_store_catalog.sql`](../vektra/scripts/migrations/002_store_catalog.sql)
on Clever Cloud before deploying code that uses store items or purchases. It
creates `store_items` and `purchases`, and adds `purchase_id` /
`store_item_id` to `transactions`.

**Verify:**

```sql
SHOW TABLES LIKE 'store_items';
SHOW TABLES LIKE 'purchases';
SHOW COLUMNS FROM transactions LIKE 'purchase_id';
```

---

## Troubleshooting and rollback

### Logs

```bash
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f web
```

On Render: open the service in the dashboard → "Logs" tab.

### Container health

```bash
docker compose ps
```

If `vektra-mysql` shows `unhealthy`, inspect the healthcheck:

```bash
docker inspect --format '{{json .State.Health}}' vektra-mysql
```

### Rebuild one service after a code or env change

```bash
docker compose up -d --build backend
```

### Reset the database (destroys data)

```bash
docker compose down -v
docker compose up -d --build
```

Use this only if migrations are stuck or the schema is in a bad state — the
`mysql_data` volume goes with it.

### Rolling back

- **Compose**: check out a previous git tag and run
  `docker compose up -d --build`. Images are rebuilt deterministically from
  source, so there is no separate "image registry rollback" step.
- **Render**: dashboard → service → "Events" → "Rollback to previous
  deploy".

---

## CI/CD

There is **no CI/CD pipeline yet** — there are no GitHub Actions workflows
that build, test, or deploy on push. Render auto-deploys on `git push` to
the connected branch. Adding a CI pipeline (lint + tests on PR, image build
on merge) is a natural next task.
