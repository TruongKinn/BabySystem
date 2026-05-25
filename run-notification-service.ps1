# Run Notification Service with Auto-loaded Vault Token
# Script này tự động đọc Root Token từ codebase/infrastructure/vault/cluster-keys.json
# và thiết lập biến môi trường VAULT_TOKEN trước khi khởi chạy notification-service.
# Giúp chạy local cực kỳ tiện lợi, an toàn và không bị lộ Secret trên Git.

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$keysFile = Join-Path $scriptDir "codebase\infrastructure\vault\cluster-keys.json"

Write-Host "=== KHỞI CHẠY NOTIFICATION-SERVICE VỚI VAULT AUTO-AUTH ===" -ForegroundColor Cyan

if (-not (Test-Path $keysFile)) {
    Write-Error "Không tìm thấy tệp cluster-keys.json tại: $keysFile"
    Write-Host "Vui lòng đảm bảo bạn đã khởi chạy Vault thông qua Docker Compose và chạy bootstrap thành công!" -ForegroundColor Yellow
    exit 1
}

# 1. Đọc Token thực tế từ cluster-keys.json
Write-Host "Đang đọc Vault Token từ cluster-keys.json..." -ForegroundColor Gray
$keysData = Get-Content -Raw -Path $keysFile | ConvertFrom-Json
$vaultToken = $keysData.root_token

if (-not $vaultToken) {
    Write-Error "Không tìm thấy root_token trong cluster-keys.json!"
    exit 1
}

# 2. Thiết lập biến môi trường cho tiến trình hiện tại
$env:VAULT_TOKEN = $vaultToken
Write-Host "Đã thiết lập VAULT_TOKEN thành công!" -ForegroundColor Green

# 3. Khởi chạy dịch vụ
Write-Host "Đang khởi chạy notification-service..." -ForegroundColor Cyan
cd codebase\backend\notification-service
mvn spring-boot:run
