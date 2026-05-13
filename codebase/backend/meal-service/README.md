# meal-service

Meal planning service for Mom Super App.

## Main APIs

- `POST /api/meals`
- `GET /api/meals?familyId={familyId}`
- `GET /api/meals/{id}`
- `PUT /api/meals/{id}`
- `DELETE /api/meals/{id}`
- `POST /api/meal-plans`
- `GET /api/meal-plans?familyId={familyId}&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/meal-plans/today?familyId={familyId}`
- `GET /api/meal-plans/weekly?familyId={familyId}&date=YYYY-MM-DD`
- `PUT /api/meal-plans/{id}`
- `DELETE /api/meal-plans/{id}`

## Run locally

```bash
./mvnw spring-boot:run
```

Environment variables:

- `DB_URL` default `jdbc:postgresql://localhost:5432/meal_db`
- `DB_USERNAME` default `postgres`
- `DB_PASSWORD` default `postgres`
- `PORT` default `8084`
- `KAFKA_BOOTSTRAP_SERVERS` default `localhost:9092`
- `REDIS_HOST` default `localhost`
- `REDIS_PORT` default `6379`
- `VAULT_URI` default `http://localhost:8200`
- `VAULT_TOKEN` default `root`
