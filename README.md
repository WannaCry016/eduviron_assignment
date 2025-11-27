## Reporting Engine for Large Fee Data

This NestJS + PostgreSQL service provides role-aware fee reporting for ~1000 schools. It delivers admin dashboards, developer monitoring, CSV exports, and fine-grained authorization atop millions of records.

### Architecture Overview
- **API**: Modular NestJS project (uth, users, students, ee-bills, 	ransactions, 
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

### Docker & Kubernetes
- **Docker**: docker build -t reporting-engine . then docker run -p 3000:3000 reporting-engine.
- **docker-compose**: docker-compose up --build starts API + Postgres.
- **K8s**: Apply manifests in k8s/ (configmap, secret, deployment, service). Replace the container image reference with your registry. Probes target /health.

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
