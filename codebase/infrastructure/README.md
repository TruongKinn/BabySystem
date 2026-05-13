# Infrastructure (Local)

Local stack for Mom Super App backend:

- PostgreSQL
- Redis
- Kafka + Zookeeper + Kafka UI
- Vault (dev mode)
- MinIO

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

## Service env defaults

- Kafka: `KAFKA_BOOTSTRAP_SERVERS=localhost:9092`
- Redis: `REDIS_HOST=localhost`, `REDIS_PORT=6379`
- Vault: `VAULT_URI=http://localhost:8200`, `VAULT_TOKEN=root`
- MinIO: `MINIO_ENDPOINT=http://localhost:9000`, `MINIO_ACCESS_KEY=minioadmin`, `MINIO_SECRET_KEY=minioadmin`
