## Reporting Engine for Large Fee Data

This NestJS + PostgreSQL service provides role-aware fee reporting for ~1000 schools. It delivers admin dashboards, developer monitoring, CSV exports, and fine-grained authorization atop millions of records.

### Architecture Overview
- **API**: Modular NestJS project (auth, users, students, e-bills, 	ransactions, 
eports). ValidationPipe enforces DTO contracts; throttling protects shared resources.
- **Data**: PostgreSQL with TypeORM entities/migrations. Indices on status/due dates support large analytical queries.
- **AuthN/Z**: JWT-based login plus permission & field-level masking via PermissionsGuard. Role policies (ROLE_POLICIES) define allowed actions and data visibility.
- **Reporting**:
  - /reports/dashboard: Aggregated due vs collected, breakdowns by school/payment/grade, sampled outstanding bills.
  - /reports/pending-payments: Paginated outstanding queue; /export variant emits CSV (admin optional feature).
  - /reports/transactions/failures: Monitoring feed for developers with filters (optional monitoring requirement).
- **Data seeding**: 
pm run seed synthesizes ~60k students and millions of fee/transaction rows using Faker to mimic irregular payment flows across 1000 schools.

### Getting Started
```
npm install
cp env.example .env
# update .env with your Postgres + JWT secrets
npm run build
npm run migration:run
npm run seed
npm run start:dev
```
Seeded credentials (change in production): super.admin / ChangeMe123!. Sample role accounts (password `ChangeMe123!` by default): `super_admin`, `school_admin`, `finance_analyst`, `developer`. See Postman collection in `postman/reporting-engine.postman_collection.json`.

### Database & Data Seeding
1. Provision PostgreSQL 14+ and create a database (default: `reporting`).
2. Update `.env` with host, port, db name, username, and password.
3. Run `npm run migration:run` to apply the TypeORM schema in `src/database/migrations`.
4. Execute `npm run seed` to populate users, schools, students, fee bills, and transactions via Faker (~3k students by default). Adjust `SEED_*` env vars to scale volume.
5. Start the API with `npm run start:dev` and hit `http://localhost:3000/health` to verify readiness.

### Docker Workflow
1. `cp env.example .env` and set the values that map to your containerized Postgres.
2. Build the API image: `docker build -t reporting-engine .`.
3. Run migrations + seeds automatically with Compose: `docker compose up --build`.
   - `postgres` uses the credentials from `.env`.
   - The `api` service waits for Postgres, runs `npm run migration:run`, `npm run seed`, then launches `node dist/main.js`.
4. To run the API container against an external DB instead, supply the proper `DATABASE_*` env vars:  
   `docker run --env-file .env -p 3000:3000 reporting-engine`.

### Kubernetes Deployment
1. Build and push the Docker image to your registry, then update `image:` in `k8s/deployment.yaml`.
2. Create/update the config and secrets (edit `k8s/configmap.yaml` + `k8s/secret.yaml` with your cluster-safe values):  
   `kubectl apply -f k8s/configmap.yaml -f k8s/secret.yaml`.
3. If you want an in-cluster Postgres, apply `k8s/postgres.yaml` (or point the env vars at RDS/Aurora). This exposes `reporting-postgres:5432`.
4. Deploy the API + service: `kubectl apply -f k8s/deployment.yaml -f k8s/service.yaml`.
5. Run the migration + seed job once (port-forward Pod and run `npm run migration:run` / `npm run seed`, or craft a short-lived Kubernetes Job) before routing traffic.
6. Probes hit `/health` so you can confirm readiness with `kubectl get pods` or `kubectl port-forward svc/reporting-engine 8080:80`.

### Postgres Checklist
- Ensure the database referenced in `.env` exists (`createdb reporting`).
- Grant the configured user ownership: `psql -c "ALTER DATABASE reporting OWNER TO <user>;"`.
- Migrations create all tables/enums; rerun any time schemas change.
- Seeding wipes students/fee bills/transactions and repopulates them. Skip in production if you already have real data.

### Verifying With Postman
1. Import `postman/reporting-engine.postman_collection.json`.
2. Call `POST /auth/login` with `super.admin / ChangeMe123!` (or another seeded role account) to obtain a JWT.
3. Set the `Authorization: Bearer <token>` header for the remaining requests.
4. Hit:
   - `GET /reports/dashboard` – expect totals, breakdowns, and masked fields per role.
   - `GET /reports/pending-payments?page=1&limit=25` – paginated outstanding queue.
   - `GET /reports/pending-payments/export` – should download CSV (inspected in Postman or curl).
   - `GET /reports/transactions/failures?lastHours=24` – developer monitoring feed.
5. If any response fails, re-check the DB connection string and that migrations + seed completed.

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
- `npm run seed` – generates benchmarking data (expect a few minutes).

### Transparency on External Help
- Code authored with Cursor + GPT-based assistance; no external repositories copied. References: NestJS docs, TypeORM docs, AWS whitepapers. Provide Cursor chat export + Postman collection in final submission as required.

### Next Steps
- Add Redis caching for hot dashboards.
- Build alerting worker (BullMQ/SQS) for failed transactions w/ SMS/Email integration.
- Implement feature-flagged data masking + audit trails (OpenTelemetry + Loki/ELK).
- Expand automated test coverage (integration tests with Testcontainers).

Feel free to reach out for a walkthrough or to discuss productionization details.
