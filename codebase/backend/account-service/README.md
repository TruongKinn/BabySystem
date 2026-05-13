# account-service

Account and family management service for Mom Super App.

## Main APIs

- `POST /api/users`
- `GET /api/users/{id}`
- `POST /api/families`
- `GET /api/families/{id}`
- `POST /api/families/{id}/members`

## Run locally

```bash
./mvnw spring-boot:run
```

Environment variables:

- `DB_URL` default `jdbc:postgresql://localhost:5432/account_db`
- `DB_USERNAME` default `postgres`
- `DB_PASSWORD` default `postgres`
- `PORT` default `8082`
- `KAFKA_BOOTSTRAP_SERVERS` default `localhost:9092`
- `REDIS_HOST` default `localhost`
- `REDIS_PORT` default `6379`
- `VAULT_URI` default `http://localhost:8200`
- `VAULT_TOKEN` default `root`
