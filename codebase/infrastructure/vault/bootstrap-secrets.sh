#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KEYS_FILE="${SCRIPT_DIR}/cluster-keys.json"

echo "=== HASHICORP VAULT PRODUCTION BOOTSTRAP ==="

# 1. Chờ Vault container trực tuyến
echo "Chờ dịch vụ Vault trực tuyến..."
until docker exec mom-vault vault status >/dev/null 2>&1 || [ $? -eq 2 ]; do
  echo "Đang đợi container mom-vault..."
  sleep 2
done

# 2. Khởi tạo Vault nếu chưa làm
INIT_STATUS=$(docker exec mom-vault vault operator init -status 2>&1 || true)
if echo "$INIT_STATUS" | grep -q "Vault is not initialized"; then
  echo "Vault chưa được khởi tạo. Đang thực hiện khởi tạo..."
  KEYS_JSON=$(docker exec mom-vault vault operator init -format=json)
  echo "$KEYS_JSON" > "$KEYS_FILE"
  echo "Khởi tạo thành công! Khóa giải mã được lưu tại: codebase/infrastructure/vault/cluster-keys.json"
else
  echo "Vault đã được khởi tạo từ trước."
fi

# 3. Giải mã (Unseal) Vault nếu đang bị khóa
SEALED_STATUS=$(docker exec mom-vault vault status -format=json 2>/dev/null || true)
if echo "$SEALED_STATUS" | grep -q '"sealed": true'; then
  echo "Vault đang bị khóa (sealed). Đang tiến hành giải mã..."
  if [ ! -f "$KEYS_FILE" ]; then
    echo "LỖI: Không tìm thấy tệp tin cluster-keys.json để giải mã tự động."
    echo "Vui lòng chạy giải mã thủ công bằng lệnh: docker exec -it mom-vault vault operator unseal"
    exit 1
  fi
  
  KEY1=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$KEYS_FILE')).unseal_keys_b64[0])")
  KEY2=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$KEYS_FILE')).unseal_keys_b64[1])")
  KEY3=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$KEYS_FILE')).unseal_keys_b64[2])")
  
  docker exec mom-vault vault operator unseal "$KEY1" > /dev/null
  docker exec mom-vault vault operator unseal "$KEY2" > /dev/null
  docker exec mom-vault vault operator unseal "$KEY3" > /dev/null
  echo "Giải mã Vault thành công!"
else
  echo "Vault đã được mở khóa (unsealed)."
fi

# 4. Đọc Token Root để xác thực và cấu hình
if [ -f "$KEYS_FILE" ]; then
  VAULT_TOKEN=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$KEYS_FILE')).root_token)")
else
  VAULT_TOKEN="${VAULT_TOKEN:-root}"
fi

# 5. Kiểm tra và kích hoạt KV Secrets Engine v2 tại /secret
echo "Kiểm tra KV Secrets Engine..."
SECRETS_LIST=$(docker exec mom-vault sh -c "export VAULT_TOKEN=$VAULT_TOKEN; vault secrets list -format=json" 2>/dev/null || echo "{}")
if echo "$SECRETS_LIST" | grep -q '"secret/"'; then
  echo "KV v2 secrets engine tại secret/ đã được kích hoạt."
else
  echo "KV v2 secrets engine tại secret/ chưa được kích hoạt. Đang tiến hành bật..."
  docker exec mom-vault sh -c "export VAULT_TOKEN=$VAULT_TOKEN; vault secrets enable -path=secret kv-v2"
  echo "Kích hoạt KV v2 thành công."
fi

# 6. Nạp thông tin cấu hình bí mật cho các Service
echo "Đang ghi các thông tin bảo mật vào Vault..."

docker exec mom-vault sh -c "
  export VAULT_ADDR=http://127.0.0.1:8200
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

  vault kv put secret/ai-service \
    OPENAI_API_KEY='your-gemini-api-key-here'
"

echo "=== BOOTSTRAP VAULT HOÀN THÀNH ==="
