#!/bin/sh
set -e

VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-root}"

echo "Writing local secrets to Vault at ${VAULT_ADDR}"

docker exec mom-vault sh -c "
  export VAULT_ADDR=${VAULT_ADDR}
  export VAULT_TOKEN=${VAULT_TOKEN}

  vault kv put secret/account-service \
    DB_URL='jdbc:postgresql://localhost:5432/account_db' \
    DB_USERNAME='postgres' \
    DB_PASSWORD='postgres' \
    REDIS_HOST='localhost' \
    REDIS_PORT='6379' \
    KAFKA_BOOTSTRAP_SERVERS='localhost:9092'

  vault kv put secret/expense-service \
    DB_URL='jdbc:postgresql://localhost:5432/expense_db' \
    DB_USERNAME='postgres' \
    DB_PASSWORD='postgres' \
    REDIS_HOST='localhost' \
    REDIS_PORT='6379' \
    KAFKA_BOOTSTRAP_SERVERS='localhost:9092'

  vault kv put secret/meal-service \
    DB_URL='jdbc:postgresql://localhost:5432/meal_db' \
    DB_USERNAME='postgres' \
    DB_PASSWORD='postgres' \
    REDIS_HOST='localhost' \
    REDIS_PORT='6379' \
    KAFKA_BOOTSTRAP_SERVERS='localhost:9092'

  vault kv put secret/task-service \
    DB_URL='jdbc:postgresql://localhost:5432/task_db' \
    DB_USERNAME='postgres' \
    DB_PASSWORD='postgres' \
    REDIS_HOST='localhost' \
    REDIS_PORT='6379' \
    KAFKA_BOOTSTRAP_SERVERS='localhost:9092'

  vault kv put secret/baby-service \
    DB_URL='jdbc:postgresql://localhost:5432/baby_db' \
    DB_USERNAME='postgres' \
    DB_PASSWORD='postgres' \
    REDIS_HOST='localhost' \
    REDIS_PORT='6379' \
    KAFKA_BOOTSTRAP_SERVERS='localhost:9092'

  vault kv put secret/shopping-service \
    DB_URL='jdbc:postgresql://localhost:5432/shopping_db' \
    DB_USERNAME='postgres' \
    DB_PASSWORD='postgres' \
    REDIS_HOST='localhost' \
    REDIS_PORT='6379' \
    KAFKA_BOOTSTRAP_SERVERS='localhost:9092'

  vault kv put secret/insight-service \
    DB_URL='jdbc:postgresql://localhost:5432/insight_db' \
    DB_USERNAME='postgres' \
    DB_PASSWORD='postgres' \
    REDIS_HOST='localhost' \
    REDIS_PORT='6379' \
    KAFKA_BOOTSTRAP_SERVERS='localhost:9092'

  vault kv put secret/notification-service \
    DB_URL='jdbc:postgresql://localhost:5432/notification_db' \
    DB_USERNAME='postgres' \
    DB_PASSWORD='postgres' \
    REDIS_HOST='localhost' \
    REDIS_PORT='6379' \
    KAFKA_BOOTSTRAP_SERVERS='localhost:9092'

  vault kv put secret/file-service \
    DB_URL='jdbc:postgresql://localhost:5432/file_db' \
    DB_USERNAME='postgres' \
    DB_PASSWORD='postgres' \
    REDIS_HOST='localhost' \
    REDIS_PORT='6379' \
    MINIO_ENDPOINT='http://localhost:9000' \
    MINIO_ACCESS_KEY='minioadmin' \
    MINIO_SECRET_KEY='minioadmin'

  vault kv put secret/authentication-service \
    POSTGRES_URL='jdbc:postgresql://localhost:5432/auth_db' \
    POSTGRES_USER='postgres' \
    POSTGRES_PASSWORD='postgres' \
    REDIS_HOST='localhost' \
    REDIS_PORT='6379'
"

echo "Vault bootstrap completed."
