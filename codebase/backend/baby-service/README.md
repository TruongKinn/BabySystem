# baby-service

Baby profile and activity tracking service for Mom Super App.

## Main APIs

- `POST /api/babies`
- `GET /api/babies?familyId={familyId}`
- `GET /api/babies/{id}`
- `PUT /api/babies/{id}`
- `DELETE /api/babies/{id}`
- `POST /api/babies/{id}/logs`
- `GET /api/babies/{id}/logs?date=YYYY-MM-DD`
- `POST /api/babies/{id}/vaccinations`
- `GET /api/babies/{id}/vaccinations`
- `POST /api/babies/{id}/growth-records`
- `GET /api/babies/{id}/growth-records`
- `GET /api/babies/{id}/summary?date=YYYY-MM-DD`

## Run locally

```bash
./mvnw spring-boot:run
```

Environment variables:

- `DB_URL` default `jdbc:postgresql://localhost:5432/baby_db`
- `DB_USERNAME` default `postgres`
- `DB_PASSWORD` default `postgres`
- `PORT` default `8087`
- `KAFKA_BOOTSTRAP_SERVERS` default `localhost:9092`
- `REDIS_HOST` default `localhost`
- `REDIS_PORT` default `6379`
- `VAULT_URI` default `http://localhost:8200`
- `VAULT_TOKEN` default `root`
