# Infrastructure (Local)

Local stack for Mom Super App backend:

- PostgreSQL
- Redis
- Kafka + Zookeeper + Kafka UI
- Debezium Kafka Connect (CDC for transactional outbox)
- Vault (dev mode)
- MinIO
- Keycloak (OIDC / SSO)

PostgreSQL init script creates databases:

- `auth_db`
- `account_db`
- `expense_db`
- `meal_db`
- `task_db`
- `baby_db`
- `shopping_db`
- `insight_db`
- `notification_db`
- `file_db`

## Start stack

```bash
cd codebase/infrastructure
docker compose up -d
```

Start only Keycloak (optional):

```bash
cd codebase/infrastructure
docker compose up -d keycloak
```

## Stop stack

```bash
docker compose down
```

## Kafka topics

`kafka-init` will create these topics automatically:

- `user.created`
- `family.created`
- `expense.created`
- `expense.updated`
- `expense.deleted`
- `meal.plan.created`
- `baby.log.created`
- `task.created`
- `task.completed`
- `notification.requested`
- `expense.proposal.submitted`
- `expense.proposal.approved`
- `expense.proposal.rejected`
- `expense.proposal.resubmitted`
- `expense.proposal.approval.started`
- `expense.proposal.approval.completed`
- `expense.proposal.approval.failed`
- `expense.proposal.approval.compensated`
- `notification.requested.dlq`
- `expense.proposal.submitted.dlq`
- `expense.proposal.approved.dlq`
- `expense.proposal.rejected.dlq`
- `expense.proposal.resubmitted.dlq`
- `expense.proposal.approval.started.dlq`
- `expense.proposal.approval.completed.dlq`
- `expense.proposal.approval.failed.dlq`
- `expense.proposal.approval.compensated.dlq`

## Debezium outbox

`debezium-connect` registers `expense-outbox-connector` automatically through `debezium-init`.
The connector reads `expense_db.public.outbox_events` and routes rows by `aggregatetype`, so an outbox row with
`aggregatetype = expense.proposal.approved` is emitted to the Kafka topic `expense.proposal.approved`.

Connector config:

- `infrastructure/debezium/expense-outbox-connector.json`

Kafka Connect endpoint:

- `http://localhost:8094`

## Vault bootstrap

Vault runs in dev mode with:

- address: `http://localhost:8200`
- token: `root`

Populate default secrets:

```bash
sh vault/bootstrap-secrets.sh
```

PowerShell:

```powershell
.\vault\bootstrap-secrets.ps1
```

## Keycloak bootstrap

Keycloak is exposed at `http://localhost:8080` and imports realm config from:

- `infrastructure/keycloak/micro-services-realm.json`

Default accounts and realm:

- Admin Console: `http://localhost:8080/admin`
- Admin user: `admin`
- Admin password: `admin`
- Realm: `micro-services`
- Client: `frontend-app`
- Demo login user: `demo.user`
- Demo login password: `demo123`

Quick check discovery endpoint:

```bash
curl http://localhost:8080/realms/micro-services/.well-known/openid-configuration
```

## Service env defaults

- Kafka: `KAFKA_BOOTSTRAP_SERVERS=localhost:9092`
- Redis: `REDIS_HOST=localhost`, `REDIS_PORT=6379`
- Vault: `VAULT_URI=http://localhost:8200`, `VAULT_TOKEN=root`
- MinIO: `MINIO_ENDPOINT=http://localhost:9000`, `MINIO_ACCESS_KEY=minioadmin`, `MINIO_SECRET_KEY=minioadmin`
- Keycloak: `KEYCLOAK_URL=http://localhost:8080`
