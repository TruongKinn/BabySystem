# shopping-service

Shopping lists and shopping items service for Mom Super App.

## Main APIs

- `POST /api/shopping-lists`
- `GET /api/shopping-lists?familyId={familyId}&activeOnly={true|false}`
- `GET /api/shopping-lists/{id}`
- `PUT /api/shopping-lists/{id}`
- `DELETE /api/shopping-lists/{id}`
- `POST /api/shopping-lists/{id}/items`
- `GET /api/shopping-lists/{id}/items?checked={true|false}`
- `GET /api/shopping-items?familyId={familyId}&checked={true|false}`
- `PUT /api/shopping-items/{id}`
- `POST /api/shopping-items/{id}/check`
- `DELETE /api/shopping-items/{id}`
- `GET /api/shopping-items/pending/count?familyId={familyId}`

## Run locally

```bash
./mvnw spring-boot:run
```

Environment variables:

- `DB_URL` default `jdbc:postgresql://localhost:5432/shopping_db`
- `DB_USERNAME` default `postgres`
- `DB_PASSWORD` default `postgres`
- `PORT` default `8088`
- `KAFKA_BOOTSTRAP_SERVERS` default `localhost:9092`
- `REDIS_HOST` default `localhost`
- `REDIS_PORT` default `6379`
- `VAULT_URI` default `http://localhost:8200`
- `VAULT_TOKEN` default `root`
