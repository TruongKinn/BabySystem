# task-service

Task and recurring task management service for Mom Super App.

## Main APIs

- `POST /api/v1/task-categories` (compatible with `/api/task-categories`)
- `GET /api/v1/task-categories?familyId={familyId}`
- `POST /api/v1/tasks`
- `GET /api/v1/tasks?familyId={familyId}&status={status}&assigneeUserId={userId}`
- `GET /api/v1/tasks/{id}`
- `PUT /api/v1/tasks/{id}`
- `POST /api/v1/tasks/{id}/complete`
- `DELETE /api/v1/tasks/{id}`
- `GET /api/v1/tasks/pending/count?familyId={familyId}`
- `GET /api/v1/tasks/overview?familyId={familyId}`
- `POST /api/v1/recurring-tasks`
- `GET /api/v1/recurring-tasks?familyId={familyId}`

## Run locally

```bash
./mvnw spring-boot:run
```

Environment variables:

- `DB_URL` default `jdbc:postgresql://localhost:5432/task_db`
- `DB_USERNAME` default `postgres`
- `DB_PASSWORD` default `postgres`
- `PORT` default `8086`
- `KAFKA_BOOTSTRAP_SERVERS` default `localhost:9092`
- `REDIS_HOST` default `localhost`
- `REDIS_PORT` default `6379`
- `VAULT_URI` default `http://localhost:8200`
- `VAULT_TOKEN` default `root`
