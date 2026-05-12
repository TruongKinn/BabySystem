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
