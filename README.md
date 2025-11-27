## Reporting Engine for Large Fee Data

NestJS + PostgreSQL service that delivers fee dashboards, CSV exports, and monitoring streams for ~1000 schools. Every component (auth, reports, seeding, migrations, Docker, Kubernetes) is wired and build-tested via `npm run build`.

### Architecture Overview
- **API**: Modular NestJS project (auth, users, students, e-bills, 	ransactions, 
eports). ValidationPipe enforces DTO contracts; throttling protects shared resources.
- **Data**: PostgreSQL with TypeORM entities/migrations. Indices on status/due dates support large analytical queries.
- **AuthN/Z**: JWT-based login plus permission & field-level masking via PermissionsGuard. Role policies (ROLE_POLICIES) define allowed actions and data visibility.
- **Reporting**:
  - /reports/dashboard: Aggregated due vs collected, breakdowns by school/payment/grade, sampled outstanding bills.
  - /reports/pending-payments: Paginated outstanding queue; /export variant emits CSV (admin optional feature).
  - /reports/transactions/failures: Monitoring feed for developers with filters (optional monitoring requirement).
- **Data seeding**: `npm run seed` synthesizes ~60k students and millions of fee/transaction rows using Faker to mimic irregular payment flows across 1000 schools.

---

### 1. Prerequisites
- Node.js 20.x
- PostgreSQL 14+ (local instance, Docker, or managed service)
- npm 10+
- (Optional) Docker Desktop + Kubernetes CLI for containerized workflows

---

### 2. Quick Start (Local Dev - No Docker Required)

**Step 1: Install & Configure**
```bash
npm install
cp env.example .env        # edit DB + JWT values if needed
```

**Step 2: Set Up Local PostgreSQL**
- Install PostgreSQL 14+ from https://www.postgresql.org/download/ (if not installed)
- Create the database:
  ```bash
  # Windows PowerShell (run as postgres user or with psql in PATH):
  psql -U postgres -c "CREATE DATABASE reporting;"
  
  # Or use pgAdmin GUI: right-click Databases → Create → Database name: "reporting"
  ```
- Verify `.env` has correct Postgres credentials (defaults: `localhost:5432`, user `postgres`, password `postgres`, db `reporting`)

**Step 3: Run Migrations & Seed Data**
```bash
npm run build              # verifies TypeScript + Nest compilation
npm run migration:run      # creates all tables/enums in PostgreSQL
n`npm run seed`               # populates users, students, fee bills, transactions (~3k students by default)
```

**Step 4: Start the API**
```bash
npm run start:dev          # API runs on http://localhost:3000
```

**Step 5: Verify It Works**
- Health check: `GET http://localhost:3000/health` should return `{ status: "ok", ... }`
- Default credentials: `super.admin / ChangeMe123!`
- Additional seeded logins (same password): `super_admin`, `school_admin`, `finance_analyst`, `developer`

**Troubleshooting:**
- If `migration:run` fails: ensure Postgres is running and `.env` DATABASE_* values are correct
- If connection errors: check `psql -U postgres -d reporting -c "SELECT 1;"` works
- If seed fails: ensure migrations completed successfully first

---

### 3. What Works (Feature Audit)
- **Authentication:** `/auth/login` issues JWTs with role + permissions. PermissionsGuard enforces scopes; field masking honors `fieldMasks`.
- **Reporting APIs:** `/reports/dashboard`, `/reports/pending-payments`, `/reports/pending-payments/export`, `/reports/transactions/failures` all backed by TypeORM queries and have pagination/CSV streaming implemented.
- **Database Layer:** Entities + migration `1700000000000-init-schema.ts` create the full schema. `npm run migration:run` succeeds using the shared `data-source.ts`.
- **Seeding:** `n`npm run seed`` wipes lookup tables (students, fee bills, transactions) and repopulates them with Faker data (~3k students by default). Seed volume is controlled by `SEED_*` env vars.
- **Guards/Decorators:** JWT guard + permissions decorator verified via `npm run build`. Current user decorator injects `AuthenticatedUser`.
- **Container/K8s:** Dockerfile, Compose stack, and `k8s/` manifests are aligned with `.env` keys.

---

### 4. Live Demo with Postman (Step-by-Step)

**Prerequisites:** API must be running (`npm run start:dev`) and database seeded.

**Step 1: Verify Everything Works**
```bash
npm run verify:demo
```
This checks health, login, and all reporting endpoints. Should show ✅ all checks passed.

**Step 2: Import Postman Collection**
1. Open Postman
2. Click **Import** → Select `postman/reporting-engine.postman_collection.json`
3. Collection appears as "Reporting Engine API - Live Demo"

**Step 3: Set Base URL (if needed)**
- Collection variable `baseUrl` defaults to `http://localhost:3000`
- If your API runs on a different port, edit the variable

**Step 4: Login and Get JWT Token**
1. Run request **"2. Login - Super Admin"**
2. You should get a response like:
   ```json
   {
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "expiresIn": "4h"
   }
   ```
3. **Copy the `accessToken` value**
4. In Postman, click the collection name → **Variables** tab
5. Paste token into `accessToken` variable → **Save**

**Step 5: Test All Endpoints**
Now run these requests in order (they'll automatically use the token):

1. **"1. Health Check"** → Should return `{ status: "ok", ... }`

2. **"3. Dashboard Summary"** → Returns:
   - `totals`: amountDue, amountCollected, outstanding, collectionRate
   - `breakdowns`: bySchool, byPaymentMethod, byGrade
   - `outstandingSamples`: 25 sample bills with student details
   - Note: Guardian emails/phones are visible (super admin has no field masks)

3. **"4. Pending Payments (Paginated)"** → Returns:
   - `total`: total count of pending bills
   - `page`, `limit`: pagination info
   - `data`: array of bills with student info

4. **"5. Export Pending Payments (CSV)"** → 
   - Downloads CSV file automatically in Postman
   - Open the downloaded file to see formatted data
   - Contains: referenceCode, status, amounts, student details, etc.

5. **"6. Transaction Failures (Monitoring)"** →
   - First, run **"2b. Login - Developer"** to get a developer token
   - Copy that token to `devToken` variable
   - Then run this request to see failed transactions

**Step 6: Test Role-Based Field Masking**
1. Login as different roles to see field masking:
   - `finance_analyst` / `ChangeMe123!` → Guardian emails hidden
   - `developer` / `ChangeMe123!` → Guardian emails + phones hidden
   - `super.admin` / `ChangeMe123!` → All fields visible
2. Run dashboard/pending-payments with each token to see differences

**Expected Demo Results:**
- Dashboard shows realistic totals (thousands in fees due/collected)
- Pending payments list shows bills with various statuses
- CSV export downloads successfully with masked fields
- Transaction failures endpoint shows failed payment attempts
- Different roles see different data based on permissions

**Troubleshooting:**
- If login fails: Check that seed ran successfully (`n`npm run seed``)
- If endpoints return 401: Token expired or invalid - re-login and update variable
- If endpoints return 403: User lacks required permissions - use super.admin
- If no data: Ensure seed completed (`n`npm run seed`` should show "Seeding complete")

---

### 5. Database Checklist
- Create the database (`createdb reporting`) and grant ownership to your app user.
- Update `.env` with `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`.
- `npm run migration:run` → creates tables/enums; rerun on schema changes.
- `n`npm run seed`` → regenerates users/students/bills/transactions; skip in prod if you already have live data.

---

### 6. Docker Workflow (Optional - Requires Docker Desktop)

**Note:** Docker is optional. You can run everything locally with Postgres installed (see Quick Start above).

If you prefer containerized setup:

1. **Start Docker Desktop** (Windows/macOS) - ensure it's running before proceeding
2. `cp env.example .env` and configure secrets
3. Build image: `docker build -t reporting-engine .`
4. One command bootstrap (API + Postgres + seed): `docker compose up --build`
   - `postgres` uses `.env` credentials
   - `api` waits for DB health, runs migrations + seed, then `node dist/main.js`
5. Run API against external DB: `docker run --env-file .env -p 3000:3000 reporting-engine`
6. Stop stack: `docker compose down`

**Common Error:** If you see "docker daemon is not running", start Docker Desktop first.

---

### 7. Kubernetes Deployment
1. Build + push Docker image, then edit `k8s/deployment.yaml` to reference your registry (e.g., `ghcr.io/you/reporting-engine:<tag>`).
2. Apply config + secrets (update values first):  
   `kubectl apply -f k8s/configmap.yaml -f k8s/secret.yaml`
3. Optional in-cluster Postgres (with PVC):  
   `kubectl apply -f k8s/postgres.yaml`
4. Deploy API + service:  
   `kubectl apply -f k8s/deployment.yaml -f k8s/service.yaml`
5. Run migrations/seeds inside the cluster once:
   - `kubectl exec -it deploy/reporting-engine -- npm run migration:run`
   - `kubectl exec -it deploy/reporting-engine -- n`npm run seed``
6. Readiness/Liveness probes target `/health`. Verify with `kubectl get pods` or port-forward `kubectl port-forward svc/reporting-engine 8080:80`.

---

### 8. Architecture Overview
- **API Modules:** Auth, Users, Students, Fee Bills, Transactions, Reports.
- **Validation & Guardrails:** Global ValidationPipe, Throttler (60 req/min), JWT guard + Permissions guard.
- **Storage:** PostgreSQL + TypeORM; indices on due dates, statuses, and payment methods for report speed.
- **Data Seeding:** Faker-driven dataset covering thousands of students and millions of bills/transactions (adjustable).
- **Exports & Monitoring:** CSV streaming limited to 5k rows/request; transaction failure feed for developer monitoring.

---

### 9. Testing & Tooling
- `npm run lint` – ESLint/Prettier
- `npm run test` – unit test placeholder (extend with Jest suites)
- `npm run test:e2e` – Nest e2e harness (requires running DB)
- `n`npm run seed`` – regenerate synthetic dataset (expect a few minutes)

---

### 10. Production Notes
- Consider AWS RDS for PostgreSQL (Multi-AZ) or Aurora; stream CDC to analytics stores as needed.
- Secure secrets via AWS Secrets Manager or Kubernetes secrets with external secret managers.
- Add Redis caching for hot dashboard queries, and background workers (BullMQ/SQS) for async exports/alerts.
- Observability: CloudWatch + X-Ray (AWS) or Grafana/Loki/Tempo (self-hosted).

---

### 11. Transparency
- Built with Cursor + GPT-based assistance; references limited to official NestJS/TypeORM/AWS docs. Include Postman collection + Cursor export in final submissions.

---

### 12. Next Steps
- Introduce Redis caching of dashboard aggregates.
- Add alerting worker for failed transactions (BullMQ/SQS + SMS/Email).
- Implement audit trails + OpenTelemetry.
- Expand automated test coverage (unit + integration with Testcontainers).

Feel free to reach out for walkthroughs or further productionization help.

### AWS Production Strategy
- **Compute**: ECS Fargate or EKS with HPA on CPU and business KPIs (outstanding amount). Use Graviton for cost savings.
- **Database**: Amazon RDS for PostgreSQL (Multi-AZ, read replicas, Performance Insights). Stream CDC (DMS/Kinesis) to Redshift/S3 for analytics & archival exports.
- **Networking/Security**: Private subnets, ALB + WAF, Security Groups limiting DB to API tasks. All secrets managed via AWS Secrets Manager + IAM roles.
- **Observability**: CloudWatch metrics/logs + X-Ray traces. EventBridge rules trigger SNS/Slack alerts when transaction failures spike.
- **Scaling**: Redis/ElastiCache cache for dashboard aggregates, S3 + Glacier for cold storage CSV exports.

### Design Decisions & Trade-offs
- Chose NestJS for modularity and TypeORM for rapid schema evolution; for extreme scale we can swap to read-optimized views or columnar stores.
- Field masking is done post-query to avoid duplicating SELECT clauses; can be moved into SQL views if needed.
- CSV export limited to 5k rows/request to keep Postgres healthy; batch exports should run via async workers (future work).
- Optional requirements (monitoring + Excel export) are implemented via dedicated endpoints and CSV streaming.

### Testing & Tooling
- `npm run lint` – ESLint/Prettier cleanup.
- `npm run test` – placeholder for Jest unit tests; extend with more suites as needed.
- `npm run test:e2e` – Nest e2e harness against a running database.
- `n`npm run seed`` – generates benchmarking data (expect a few minutes).

### Transparency on External Help
- Code authored with Cursor + GPT-based assistance; no external repositories copied. References: NestJS docs, TypeORM docs, AWS whitepapers. Provide Cursor chat export + Postman collection in final submission as required.

### Next Steps
- Add Redis caching for hot dashboards.
- Build alerting worker (BullMQ/SQS) for failed transactions w/ SMS/Email integration.
- Implement feature-flagged data masking + audit trails (OpenTelemetry + Loki/ELK).
- Expand automated test coverage (integration tests with Testcontainers).

Feel free to reach out for a walkthrough or to discuss productionization details.
