$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$keysFile = Join-Path $scriptDir "cluster-keys.json"

Write-Host "=== HASHICORP VAULT PRODUCTION BOOTSTRAP (POWERSHELL) ==="

# 1. Chờ Vault container trực tuyến
Write-Host "Chờ dịch vụ Vault trực tuyến..."
while ($true) {
    $status = docker exec mom-vault vault status 2>&1
    $lastExit = $LASTEXITCODE
    if ($lastExit -eq 0 -or $lastExit -eq 2) {
        break
    }
    Write-Host "Đang đợi container mom-vault..."
    Start-Sleep -Seconds 2
}

# 2. Khởi tạo Vault nếu chưa làm
$initStatus = docker exec mom-vault vault operator init -status 2>&1
if ($initStatus -like "*Vault is not initialized*") {
    Write-Host "Vault chưa được khởi tạo. Đang thực hiện khởi tạo..."
    $keysJson = docker exec mom-vault vault operator init -format=json
    $keysJson | Out-File -FilePath $keysFile -Encoding utf8
    Write-Host "Khởi tạo thành công! Khóa giải mã được lưu tại: codebase/infrastructure/vault/cluster-keys.json"
} else {
    Write-Host "Vault đã được khởi tạo từ trước."
}

# 3. Giải mã (Unseal) Vault nếu đang bị khóa
$statusJsonRaw = docker exec mom-vault vault status -format=json 2>$null
if ($statusJsonRaw) {
    $statusJson = $statusJsonRaw | ConvertFrom-Json
    $sealed = $statusJson.sealed
} else {
    $sealed = $true
}

if ($sealed) {
    Write-Host "Vault đang bị khóa (sealed). Đang tiến hành giải mã..."
    if (-not (Test-Path $keysFile)) {
        Write-Error "LỖI: Không tìm thấy tệp tin cluster-keys.json để giải mã tự động."
        Write-Host "Vui lòng chạy giải mã thủ công bằng lệnh: docker exec -it mom-vault vault operator unseal"
        exit 1
    }
    
    $keysData = Get-Content -Raw -Path $keysFile | ConvertFrom-Json
    $key1 = $keysData.unseal_keys_b64[0]
    $key2 = $keysData.unseal_keys_b64[1]
    $key3 = $keysData.unseal_keys_b64[2]
    
    docker exec mom-vault vault operator unseal $key1 > $null
    docker exec mom-vault vault operator unseal $key2 > $null
    docker exec mom-vault vault operator unseal $key3 > $null
    Write-Host "Giải mã Vault thành công!"
} else {
    Write-Host "Vault đã được mở khóa (unsealed)."
}

# 4. Đọc Token Root để xác thực và cấu hình
if (Test-Path $keysFile) {
    $keysData = Get-Content -Raw -Path $keysFile | ConvertFrom-Json
    $vaultToken = $keysData.root_token
} else {
    $vaultToken = if ($env:VAULT_TOKEN) { $env:VAULT_TOKEN } else { "root" }
}

# 5. Kiểm tra và kích hoạt KV Secrets Engine v2 tại /secret
Write-Host "Kiểm tra KV Secrets Engine..."
$secretsListRaw = docker exec mom-vault sh -c "export VAULT_TOKEN=$vaultToken; vault secrets list -format=json" 2>$null
if ($secretsListRaw) {
    $secretsList = $secretsListRaw | ConvertFrom-Json
    $kvEnabled = $null -ne $secretsList."secret/"
} else {
    $kvEnabled = $false
}

if (-not $kvEnabled) {
    Write-Host "KV v2 secrets engine tại secret/ chưa được kích hoạt. Đang tiến hành bật..."
    docker exec mom-vault sh -c "export VAULT_TOKEN=$vaultToken; vault secrets enable -path=secret kv-v2"
    Write-Host "Kích hoạt KV v2 thành công."
} else {
    Write-Host "KV v2 secrets engine tại secret/ đã được kích hoạt."
}

# 6. Nạp thông tin cấu hình bí mật cho các Service
Write-Host "Đang ghi các thông tin bảo mật vào Vault..."

docker exec mom-vault sh -c @"
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='$vaultToken'

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
"@

Write-Host "=== BOOTSTRAP VAULT HOÀN THÀNH ==="
