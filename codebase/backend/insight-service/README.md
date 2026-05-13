# insight-service

Statistics and dashboard aggregation service for Mom Super App.

## Main APIs

- `GET /api/insights/daily?familyId={familyId}&date=YYYY-MM-DD`
- `GET /api/insights/dashboard?familyId={familyId}&date=YYYY-MM-DD`
- `GET /api/insights/monthly?familyId={familyId}&month=YYYY-MM`

Consumes Kafka topics:

- `expense.created`
- `expense.updated`
- `expense.deleted`
- `meal.plan.created`
- `task.created`
- `task.completed`
- `baby.log.created`

## Run locally

```bash
./mvnw spring-boot:run
```

Environment variables:

- `DB_URL` default `jdbc:postgresql://localhost:5432/insight_db`
- `DB_USERNAME` default `postgres`
- `DB_PASSWORD` default `postgres`
- `PORT` default `8089`
- `KAFKA_BOOTSTRAP_SERVERS` default `localhost:9092`
- `REDIS_HOST` default `localhost`
- `REDIS_PORT` default `6379`
- `VAULT_URI` default `http://localhost:8200`
- `VAULT_TOKEN` default `root`
