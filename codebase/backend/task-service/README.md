# task-service

Task and recurring task management service for Mom Super App.

## Main APIs

- `POST /api/task-categories`
- `GET /api/task-categories?familyId={familyId}`
- `POST /api/tasks`
- `GET /api/tasks?familyId={familyId}&status={status}&assigneeUserId={userId}`
- `GET /api/tasks/{id}`
- `PUT /api/tasks/{id}`
- `POST /api/tasks/{id}/complete`
- `DELETE /api/tasks/{id}`
- `GET /api/tasks/pending/count?familyId={familyId}`
- `POST /api/recurring-tasks`
- `GET /api/recurring-tasks?familyId={familyId}`

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
