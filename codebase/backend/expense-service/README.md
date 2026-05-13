# expense-service

Expense tracking and budget management service for Mom Super App.

## Main APIs

- `POST /api/categories`
- `GET /api/categories?familyId={familyId}`
- `POST /api/budgets`
- `PUT /api/budgets/{id}`
- `GET /api/budgets?familyId={familyId}`
- `POST /api/expenses`
- `GET /api/expenses/{id}`
- `GET /api/expenses?familyId={familyId}&month=YYYY-MM`
- `GET /api/expenses/summary?familyId={familyId}&month=YYYY-MM`
- `GET /api/expenses/summary/daily?familyId={familyId}&date=YYYY-MM-DD`
- `GET /api/expenses/reports/categories?familyId={familyId}&month=YYYY-MM`
- `PUT /api/expenses/{id}`
- `DELETE /api/expenses/{id}`

## Run locally

```bash
./mvnw spring-boot:run
```

Environment variables:

- `DB_URL` default `jdbc:postgresql://localhost:5432/expense_db`
- `DB_USERNAME` default `postgres`
- `DB_PASSWORD` default `postgres`
- `PORT` default `8083`
- `KAFKA_BOOTSTRAP_SERVERS` default `localhost:9092`
- `REDIS_HOST` default `localhost`
- `REDIS_PORT` default `6379`
- `VAULT_URI` default `http://localhost:8200`
- `VAULT_TOKEN` default `root`
