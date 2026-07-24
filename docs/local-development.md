# Local development

This guide gets you from a fresh clone to a running stack. There are two
supported workflows: **full Docker** (closest to production) and **hybrid**
(MySQL in Docker, backend and frontends running on your host with hot
reload).

For the architecture this is running, see [architecture.md](./architecture.md).
For deployment to staging, see [deployment.md](./deployment.md).

---

## Prerequisites

| Tool             | Version          | Why                                                |
| ---------------- | ---------------- | -------------------------------------------------- |
| Node.js          | **20.x**         | Matches `node:20-alpine` in the web/admin images   |
| Java JDK         | **17**           | Matches `eclipse-temurin-17` in the backend image  |
| Maven            | **3.9+**         | Matches the build image used in `vektra/Dockerfile`|
| Docker Desktop   | latest stable    | For Compose, MySQL, and full-stack runs            |
| Git              | any recent       | —                                                  |
| MySQL 8 client   | optional         | Only if you want to inspect the DB outside Docker  |

On Windows, Docker Desktop must be running with WSL 2 backend enabled.

---

## Workflow A — Full Docker (closest to production)

Use this when you want production-realistic routing through Nginx and you
don't need a debugger attached.

```bash
cd vektra
docker compose up -d --build
```

Then open:

- Public site: <http://localhost/>
- Admin: <http://localhost/admin>
- Factory: <http://localhost/factory>
- API (through Nginx): <http://localhost/api/v3/api-docs>

To stop:

```bash
docker compose down       # keeps the DB volume
docker compose down -v    # also wipes mysql_data — destroys all data
```

This workflow exercises the same Nginx config and same Dockerfiles that run
in self-hosted production. If something works in Compose but breaks on
Render (or vice versa), the difference is almost always in the **edge** —
Nginx vs. no Nginx — not in the apps themselves.

---

## Workflow B — Hybrid (recommended for active development)

This is how you'll spend most of your time: MySQL in Docker, backend in your
IDE, frontends with hot reload. You get a real debugger on the JVM, fast
refresh on Next.js, and no rebuild loop for code changes.

### 1. Start MySQL only

```bash
cd vektra
docker compose up -d mysql
```

From your host, MySQL is on **port 3308** (not 3306). Connect with:

- Host: `localhost`
- Port: `3308`
- User: `root`
- Password: `root`
- Database: `vektra`

The mismatch (3308 outside, 3306 inside) is documented in
`docker-compose.yml` and exists to avoid colliding with a local MySQL or a
Docker Desktop port reservation on Windows.

### 2. Start the backend in your IDE

Either run `VektraApplication` from IntelliJ (Run → main class) or:

```bash
cd vektra
mvn spring-boot:run
```

By default Spring connects to `localhost:3306`. Since the Dockerized MySQL
is on **3308**, override the JDBC URL in your run configuration or shell:

**PowerShell:**
```powershell
$env:SPRING_DATASOURCE_URL = "jdbc:mysql://localhost:3308/vektra?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
mvn spring-boot:run
```

**bash / zsh:**
```bash
export SPRING_DATASOURCE_URL="jdbc:mysql://localhost:3308/vektra?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
mvn spring-boot:run
```

The backend listens on <http://localhost:8080> with context-path `/api`,
so the API is at <http://localhost:8080/api/...>.

### 3. Start the frontends with hot reload

Run from the **repo root** (this is an npm workspaces setup, so installs and
scripts are managed at the root):

```bash
npm install              # one time
npm run dev:web          # http://localhost:3000
npm run dev:admin        # http://localhost:3000/admin (in a second terminal)
npm run dev:factory      # http://localhost:3000/factory (in a third terminal)
```

In dev there is **no Nginx**. The browser hits the Next.js dev server
directly; Next.js's `rewrites()` proxies `/spring-api/*` to
`http://localhost:8080/api/*` (see
[`apps/web/next.config.mjs`](../apps/web/next.config.mjs)). That means dev
uses the same code path as Render production, not the Compose code path.

---

## Daily commands cheat sheet

```bash
# --- Compose / Docker ---
docker compose -f vektra/docker-compose.yml up -d --build
docker compose -f vektra/docker-compose.yml ps
docker compose -f vektra/docker-compose.yml logs -f backend
docker compose -f vektra/docker-compose.yml exec mysql mysql -uroot -proot vektra
docker compose -f vektra/docker-compose.yml down

# --- Frontends (run from repo root) ---
npm run dev:web
npm run dev:admin
npm run dev:factory
npm run lint:web
npm run lint:admin
npm run lint:factory
npm run build:web
npm run build:admin
npm run build:factory

# --- Backend ---
cd vektra && mvn spring-boot:run
cd vektra && mvn test
cd vektra && mvn -DskipTests package
```

---

## Common gotchas

- **"Port 3306 already in use"** — the host port for MySQL is **3308**, not
  3306. Connect tools and the IDE-run backend to `localhost:3308`.
- **"I changed `.env.local` and nothing happened"** — anything starting with
  `NEXT_PUBLIC_` is baked at dev-server start. Restart `npm run dev:web` (or
  `dev:admin`) for it to take effect.
- **Backend can't reach MySQL with `mysql:3306` outside Docker** — that
  hostname only resolves on the Compose network. From your IDE, use
  `localhost:3308`.
- **First `docker compose up` is slow (~30–60 s)** — `backend` waits for the
  `mysql` healthcheck to pass before starting. Subsequent boots are faster.
- **`@vladmandic/face-api` "Critical dependency" warning during build** — it
  is intentionally silenced in
  [`apps/web/next.config.mjs`](../apps/web/next.config.mjs). Don't try to
  "fix" it.
- **Admin app at `http://localhost:3000` returns 404** — admin is built with
  `basePath: /admin`. Use <http://localhost:3000/admin> instead.
- **Factory app at `http://localhost:3000` returns 404** — factory is built with
  `basePath: /factory`. Use <http://localhost:3000/factory> instead.
- **`docker compose down -v` deletes the database** — the `-v` flag removes
  the `mysql_data` volume. Use plain `docker compose down` if you want to
  keep your data.
- **Windows Docker Desktop port 3307 reservation** — if 3308 ever clashes
  for you too, change only the **host** side of `"3308:3306"` in
  `docker-compose.yml`. Don't change the container side.

---

## Where things live

| What                        | Path                                                                |
| --------------------------- | ------------------------------------------------------------------- |
| Compose stack definition    | [`vektra/docker-compose.yml`](../vektra/docker-compose.yml)         |
| Nginx config                | [`vektra/nginx/nginx.conf`](../vektra/nginx/nginx.conf)             |
| Backend Dockerfile          | [`vektra/Dockerfile`](../vektra/Dockerfile)                         |
| Backend Spring config       | [`vektra/src/main/resources/application.properties`](../vektra/src/main/resources/application.properties) |
| Web app Dockerfile          | [`apps/web/Dockerfile`](../apps/web/Dockerfile)                     |
| Web Next.js config (rewrites)| [`apps/web/next.config.mjs`](../apps/web/next.config.mjs)          |
| Admin Dockerfile            | [`apps/admin/Dockerfile`](../apps/admin/Dockerfile)                 |
| Render blueprint            | [`render.yaml`](../render.yaml)                                     |
| Workspace scripts           | [`package.json`](../package.json)                                   |
